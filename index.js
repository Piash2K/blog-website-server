const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    const commentsCollection = client.db("blogWebsite").collection("Comments");

    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });
    // posting comments
    app.post("/comments", async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment);
      res.send(result);
    });
    // getting comments
    app.get("/comments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { blogId: id };
      const result = await commentsCollection.find(query).toArray();
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
    app.get("/featuredBlogs", async (req, res) => {
      try {
        // Use blogsCollection instead of db.blogsCollection
        const topBlogs = await blogsCollection
          .aggregate([
            {
              $addFields: {
                stringLength: { $strLenCP: "$longDescription" }, // Calculate the string length
              },
            },
            {
              $sort: { stringLength: -1 }, // Sort by string length in descending order
            },
            {
              $limit: 10, // Get the top 10 results
            },
            {
              $project: {
                // Remove the temporary stringLength field from the response
                stringLength: 0,
              },
            },
          ])
          .toArray(); // Convert the aggregation cursor to an array

        res.status(200).json(topBlogs); // Send the result as a JSON response
      } catch (error) {
        // console.error("Error fetching blogs:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    });
    //getting data from wishlist
    app.get("/wishlist", async (req, res) => {
      const query = { userEmail: req.query.email };
      const result = await wishlist.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    // deleting from wishlist
    app.delete("/wishlist/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) }; // Ensure ObjectId is imported from 'mongodb'
      const result = await wishlist.deleteOne(query); // Replace `wishlist` with your actual collection reference
      res.send(result);
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