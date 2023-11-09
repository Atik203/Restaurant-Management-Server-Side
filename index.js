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

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "not authorized" });
    }
    req.user = decoded;
  });
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db("RestaurantManage").collection("Foods");
    const userCollection = client.db("RestaurantManage").collection("users");
    const orderedCollection = client
      .db("RestaurantManage")
      .collection("OrderedDb");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;

      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

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

    app.get("/orders", verifyToken, async (req, res) => {
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "forbidden" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await orderedCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/addedFoods", verifyToken, async (req, res) => {
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "forbidden" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderedCollection.deleteOne(query);
      res.send(result);
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
    app.patch("/foods/:id", async (req, res) => {
      try {
        const { updatedData } = req.body;
        const id = req.params?.id;
        if (!id) {
          return res.status(400).json({ error: "Food item id is missing" });
        }
        const filter = { _id: new ObjectId(id) };

        const updatedDoc = {
          $set: {
            count: updatedData.count,
            quantity: updatedData.quantity,
          },
        };

        const result = await foodCollection.updateOne(filter, updatedDoc);

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.patch("/updateFood/:id", async (req, res) => {
      try {
        const foodId = req.params.id;
        const { newFood } = req.body;

        const filter = { _id: new ObjectId(foodId) };
        const update = {
          $set: {
            name: newFood.name,
            origin: newFood.origin,
            category: newFood.category,
            quantity: newFood.quantity,
            description: newFood.description,
            price: newFood.price,
            ingredients: newFood.ingredients,
            img: newFood.img,
            madeBy: newFood.madeBy,
            email: newFood.email,
            count: newFood.count,
          },
        };

        const result = await foodCollection.updateOne(filter, update);

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/bestSell", async (req, res) => {
      try {
        const options = {
          sort: { count: -1 },
          limit: 6,
        };
        const result = await foodCollection.find({}, options).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/users", async (req, res) => {
      try {
        const userData = req.body?.userData;

        const result = await userCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/foods", async (req, res) => {
      try {
        const newFood = req.body?.newFood;

        const result = await foodCollection.insertOne(newFood);
        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).json({ error: "Internal server error" });
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
