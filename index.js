const express = require("express");
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const orderCollections = client.db("foodCartUser").collection("order");
    // get all menu
    app.get("/allMenu", async (req, res) => {
      const query = {};
      const category = req.query.category;
      const uid = req.query.uid;

      if (uid) {
        query.uid = uid;
      }
      if (category && category !== "All") {
        query.category = category;
      }

      // Fetch all menu items based on query
      const result = await menu.find(query).toArray();

      // Fetch all orders only once
      const allOrder = await orderCollections.find().toArray();

      // Loop through each menu item
      for (const singleDishFrom of result) {
        const dishId = singleDishFrom?._id.toString();
        let orderCount = 0;

        // Loop through each order
        for (const singleOrder of allOrder) {
          const { cartItems } = singleOrder;

          // Loop through each item in the cart
          for (const singleCart of cartItems) {
            // singlecart is a object
            // If cart item matches this dish, increase the count
            if (singleCart.dishId === dishId) {
              orderCount += 1; //
            }
          }
        }

        // Add order count to the dish object
        singleDishFrom.orderCount = orderCount;
      }

      // Send updated result with orderCount included for each dish
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
    app.get("/order/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await orderCollections.find(query).toArray();
      res.send(result);
    });
    // aded user cart item
    app.post("/cart", async (req, res) => {
      const information = req.body;
      const { uid, dishId, quantity } = information;

      // Check if the item already exists in the user's cart
      const query = { uid: uid, dishId: dishId };
      const existingCartItem = await cartCollections.findOne(query);

      if (existingCartItem) {
        // If exists, update quantity to the value from the body
        const updateResult = await cartCollections.updateOne(query, {
          $set: { quantity },
        });
        res.send({ updated: true, result: updateResult });
      } else {
        // If not exists, insert the new item with the provided quantity
        const insertResult = await cartCollections.insertOne(information);
        res.send({ inserted: true, result: insertResult });
      }
    });
    app.post("/order", async (req, res) => {
      const orderInfo = req.body;
      const result = await orderCollections.insertOne(orderInfo);
      res.send(result);
    });
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
    // resest user cart items
    app.delete("/resetCart/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await cartCollections.deleteMany(query);
      res.send(result);
    });
    // vender url
    app.post("/addedDish", async (req, res) => {
      const dishInfo = req.body;
      const result = await menu.insertOne(dishInfo);
      res.send(result);
    });
    app.put("/updateDish/:id", async (req, res) => {
      const id = req.params.id;
      const updateDishInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...updateDishInfo,
        },
      };
      const result = await menu.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Get all users who ordered a specific dish
    app.get("/dishOrders/:dishId", async (req, res) => {
      const dishId = req.params.dishId;

      try {
        // Find all orders that include this dishId form order collection 
        const orders = await orderCollections
          .find({
            "cartItems.dishId": dishId,
          })
          .toArray();
        // Collect all unique user IDs who ordered the dish
        const userIds = [...new Set(orders.map((order) => order.uid))];

        // Find user info for those user IDs
        const users = await foodCartUser
          .find({
            uid: { $in: userIds },
          })
          .toArray();

        res.send(users);
      } catch (error) {
        console.error("Error getting users who ordered dish:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello server");
});
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
