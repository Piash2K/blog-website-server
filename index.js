const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uouce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const blogsCollection = client.db("blogWebsite").collection("Blogs");
    const wishlist = client.db("blogWebsite").collection("Wishlist");

    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const { blogId, userEmail } = req.body;

      try {
        // Check if the blog is already in the wishlist for the user
        const previousWishlist = await wishlist.findOne({ blogId, userEmail });

        if (previousWishlist) {
          // If it exists, return a response indicating that it already exists
          return res.status(409).send({ message: "Blog already in wishlist." });
        }

        // If it doesn't exist, insert the new wish
        const result = await wishlist.insertOne(req.body);
        res.send(result);
      } catch (error) {
        // console.error("Error adding to wishlist:", error);
        res.status(500).send({ message: "Failed to add to wishlist." });
      }
    });
    app.get("/blogs", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search || ""; // Get the search query, default to empty string if not provided
      const category = req.query.category || ""; // Get the category, default to empty string if not provided

      let filter = {};

      // If there's a search query, filter the blogs by title (or other fields like content)
      if (search) {
        filter.title = { $regex: search, $options: "i" }; // Case-insensitive search by title
      }

      // If a category is selected, filter by category
      if (category) {
        filter.category = category;
      }

      try {
        const result = await blogsCollection
          .find(filter)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error fetching blogs", error: error.message });
      }
    });

    app.get("/recentBlogs", async (req, res) => {
      try {
        const result = await blogsCollection
          .find()
          .sort({ postedTime: -1 }) // Sort by postedTime (most recent first)
          .limit(6) // Limit to 6 blogs
          .toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch recent blogs", error });
      }
      app.get("/blogsCount", async (req, res) => {
        const count = await blogsCollection.estimatedDocumentCount();
        res.send({ count });
      });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Blog website running")
})

app.listen(port, () => {
  console.log(`Blog website is running at port: ${port}`);
});