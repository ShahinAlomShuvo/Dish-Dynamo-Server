const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://dishdynamo-c649f.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }

    console.log(decoded);
    req.user = decoded;
    next();
  });
};

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
    // await client.connect();

    const foodCollection = client.db("dishDynamoDB").collection("foods");
    const blogsCollection = client.db("dishDynamoDB").collection("blogData");
    const usersCollection = client.db("dishDynamoDB").collection("user");
    const orderFoodCollection = client.db("dishDynamoDB").collection("order");

    // jwt secure api

    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ status: "true" });
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ status: true });
    });

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
          orders: 1,
          description: 1,
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
        const searchPattern = new RegExp(searchValue, "i");
        query.foodName = searchPattern;
      }

      const options = {
        projection: {
          foodName: 1,
          foodImageUrl: 1,
          foodCategory: 1,
          price: 1,
          quantity: 1,
          orders: 1,
          description: 1,
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

    // food added by user  api
    app.get("/usersfood", verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const options = {
        projection: {
          foodName: 1,
          foodImageUrl: 1,
          price: 1,
          quantity: 1,
        },
      };
      const query = { userEmail: req.query.email };

      const result = await foodCollection.find(query, options).toArray();
      res.send(result);
    });

    // food added by user  api
    app.get("/orderingfoods", verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const query = { userEmail: req.query.email };
      const result = await orderFoodCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/usersfood/:id", async (req, res) => {
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

    // user order

    app.get("/orderFoods", verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const query = { userEmail: req.query.email };
      const result = await orderFoodCollection.find(query).toArray();
      res.send(result);
    });

    // post api

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // add food by user
    app.post("/usersfood", async (req, res) => {
      const newFood = req.body;
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });

    // ordering food
    app.post("/orderingfoods", async (req, res) => {
      const purchaseFood = req.body;
      const result = await orderFoodCollection.insertOne(purchaseFood);
      res.send(result);
    });

    // patch

    // update quantity (available product )
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

    // put

    // update orders(increase orders)
    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const ordersCount = req.body;
      console.log(ordersCount);
      const options = { upsert: true };

      const updateDoc = {
        $inc: {
          orders: 1,
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.put("/usersfood/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      console.log(id);

      const updateProduct = {
        $set: {
          foodImageUrl: product.foodImageUrl,
          foodName: product.foodName,
          quantity: product.quantity,
          price: product.price,
          foodOrigin: product.foodOrigin,
          foodCategory: product.foodCategory,
          userName: product.userName,
          userEmail: product.userEmail,
          description: product.description,
        },
      };
      const result = await foodCollection.updateOne(
        filter,
        updateProduct,
        options
      );
      res.send(result);
    });

    // delete
    app.delete("/orderFoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderFoodCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
