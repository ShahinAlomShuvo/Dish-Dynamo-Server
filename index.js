const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4ataypz.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const foodCollection = client.db("dishDynamoDB").collection("foods");
    const blogsCollection = client.db("dishDynamoDB").collection("blogData");

    // get api

    // top food api
    app.get("/foods", async (req, res) => {
      const options = {
        projection: {
          foodName: 1,
          foodImageUrl: 1,
          foodCategory: 1,
          price: 1,
          quantity: 1,
        },
      };
      const query = {};
      const result = await foodCollection
        .find(query, options)
        .skip(6)
        .limit(6)
        .toArray();
      res.send(result);
    });

    // allfoods api

    app.get("/allFoods", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const searchValue = req.query.searchValue;
      const query = {};
      if (searchValue) {
        // If searchValue is provided, create a regex pattern for the search
        const searchPattern = new RegExp(searchValue, "i"); // "i" for case-insensitive search

        // Add the foodName field to the query using the searchPattern
        query.foodName = searchPattern;
      }

      const options = {
        projection: {
          foodName: 1,
          foodImageUrl: 1,
          foodCategory: 1,
          price: 1,
          quantity: 1,
          order: 1,
        },
      };

      const result = await foodCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // count api
    app.get("/foodsCount", async (req, res) => {
      const count = await foodCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // single food api
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    // blogData api

    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // blogData single api
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });
    // patch
    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateQuantity = req.body;
      console.log(updateQuantity);
      const updateDoc = {
        $set: {
          quantity: updateQuantity.quantity,
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
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
  res.send("DishDynamo is Running");
});

app.listen(port, () => {
  console.log(`DishDynamo Server is Running On Port: ${port}`);
});
