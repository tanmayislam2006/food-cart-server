const express = require("express");
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kn8r7rw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const foodCartUser = client.db("foodCartUser").collection("users");
    const menu = client.db("foodCartUser").collection("allMenu");
    const cartCollections = client.db("foodCartUser").collection("cart");
    // get all menu
    app.get("/allMenu", async (req, res) => {
      const result = await menu.find().toArray();
      res.send(result);
    });
    // get user with user uid from firebase
    // ...existing code...
    app.get("/user/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const user = await foodCartUser.findOne(query);
      if (!user) {
        return res.status(404).send({ message: "User not found", user: null });
      }
      res.send(user);
    });
    // get user car items form db
    app.get("/cart/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await cartCollections.find(query).toArray();
      res.send(result);
    });
    // aded user cart item
    // ...existing code...
app.post("/cart", async (req, res) => {
  const information = req.body;
  const { uid, dishId, quantity } = information;

  // Check if the item already exists in the user's cart
  const query = { uid: uid, dishId: dishId };
  const existingCartItem = await cartCollections.findOne(query);

  if (existingCartItem) {
    // If exists, update quantity to the value from the body
    const updateResult = await cartCollections.updateOne(
      query,
      { $set: { quantity } }
    );
    res.send({ updated: true, result: updateResult });
  } else {
    // If not exists, insert the new item with the provided quantity
    const insertResult = await cartCollections.insertOne(information);
    res.send({ inserted: true, result: insertResult });
  }
});

    // app.post("/cart", async (req, res) => {
    //   const information = req.body;
    //   const {uid,dishId}=information
    //   console.log(uid,dishId);
      
    //   const result = await cartCollections.insertOne(information);
    //   res.send(result);
    // });

    // register user
    app.post("/register", async (req, res) => {
      const userInformation = req.body;
      const { email } = userInformation;
      const query = { email: email };
      const existingUser = await foodCartUser.findOne(query);
      if (existingUser) {
        return res.status(400).send({ message: "User already exists" });
      }
      const result = await foodCartUser.insertOne(userInformation);
      res.send(result);
    });
    // update the quantity with dishid
    // app.put("/cart/:dishId", async (req, res) => {
    //   const dishId = req.params.dishId;
    //   const filter = { dishId: dishId };
    //   const updateDoc = {
    //     $inc: { quantity: 1 },
    //   };
    //   const result = await cartCollections.updateOne(filter, updateDoc);
    //   res.send(result);
    // });

    // update user login information
    app.patch("/login", async (req, res) => {
      const { email, lastSignInTime } = req.body;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          lastSignInTime,
        },
      };
      const result = await foodCartUser.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Optional: You can close the client here if needed
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello server");
});
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
