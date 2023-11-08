require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.okdmlp6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db("RestaurantManage").collection("Foods");
    const orderedCollection = client
      .db("RestaurantManage")
      .collection("OrderedDb");

    app.get("/foods", async (req, res) => {
      try {
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);

        const result = await foodCollection
          .find()
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/foodsCount", async (req, res) => {
      try {
        const count = await foodCollection.estimatedDocumentCount();
        res.send({ count });
      } catch (error) {}
    });

    app.get("/searchFoods", async (req, res) => {
      try {
        const query = req.query.q;
        const result = await foodCollection
          .find({ name: { $regex: query, $options: "i" } })
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.post("/orderedFoods", async (req, res) => {
      try {
        const orderedData = req.body.orderedData;

        const result = await orderedCollection.insertOne(orderedData);
        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/filterFoods", async (req, res) => {
      try {
        const filterType = req.query.filterType;
        let sortCriteria = {};

        if (filterType === "lowToHigh") {
          sortCriteria = { price: 1 };
        } else if (filterType === "highToLow") {
          sortCriteria = { price: -1 };
        }

        const result = await foodCollection.find().sort(sortCriteria).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/SingleFood/:id", async (req, res) => {
      const foodId = req.params.id;

      try {
        const foodItem = await foodCollection.findOne({
          _id: new ObjectId(foodId),
        });
        if (foodItem) {
          res.json(foodItem);
        } else {
          res.status(404).json({ error: "Food item not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
