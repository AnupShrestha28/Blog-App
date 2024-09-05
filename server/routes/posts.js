const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const verifyToken = require("../middleware/verifyToken");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/posts/create:
 *   post:
 *     summary: Create a new blog post
 *     tags:
 *       - Posts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - desc
 *               - username
 *               - userId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the blog post
 *               desc:
 *                 type: string
 *                 description: Description of the blog post
 *               username:
 *                 type: string
 *                 description: Username of the author
 *               userId:
 *                 type: string
 *                 description: ID of the author
 *               photo:
 *                 type: string
 *                 description: URL of the photo associated with the post
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of categories
 *     responses:
 *       200:
 *         description: The newly created blog post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 desc:
 *                   type: string
 *                 username:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 photo:
 *                   type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post(
  "/create",
  verifyToken,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("desc").notEmpty().withMessage("Description is required"),
    body("username").notEmpty().withMessage("Username is required"),
    body("userId").isMongoId().withMessage("Valid userId is required"),
    body("photo").optional().isURL().withMessage("Photo must be a valid URL"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array of strings"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { title, desc, username, userId, photo, categories } = req.body;

      // Create new Post instance
      const newPost = new Post({
        title,
        desc,
        username,
        userId,
        photo,
        categories,
      });

      const savedPost = await newPost.save();
      res.status(200).json(savedPost);
    } catch (err) {
      res.status(500).json({ error: "Post creation failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update an existing blog post
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The blog post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               desc:
 *                 type: string
 *     responses:
 *       200:
 *         description: The updated blog post
 *       500:
 *         description: Post update failed
 */
router.put(
  "/:id",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Valid post ID is required"),
    body("title").optional().notEmpty().withMessage("Title must not be empty"),
    body("desc")
      .optional()
      .notEmpty()
      .withMessage("Description must not be empty"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
      res.status(200).json(updatedPost);
    } catch (err) {
      res.status(500).json({ error: "Post update failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The blog post ID
 *     responses:
 *       200:
 *         description: The post was deleted successfully
 *       500:
 *         description: Post deletion failed
 */
router.delete(
  "/:id",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Valid post ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.params.id);
      await Comment.deleteMany({ postId: req.params.id });
      res.status(200).json("Post has been deleted!");
    } catch (err) {
      res.status(500).json({ error: "Post deletion failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get blog post details by ID
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The blog post ID
 *     responses:
 *       200:
 *         description: The blog post details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 desc:
 *                   type: string
 */
router.get(
  "/:id",
  [
    param("id").isMongoId().withMessage("Valid post ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      res.status(200).json(post);
    } catch (err) {
      res.status(500).json({ error: "Post retrieval failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all blog posts
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title
 *     responses:
 *       200:
 *         description: A list of blog posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   desc:
 *                     type: string
 */
router.get(
  "/",
  [
    query("search")
      .optional()
      .isString()
      .withMessage("Search must be a string"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const query = req.query;
      const searchFilter = { title: { $regex: query.search, $options: "i" } };
      const posts = await Post.find(query.search ? searchFilter : null);
      res.status(200).json(posts);
    } catch (err) {
      res.status(500).json({ error: "Posts retrieval failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Get all blog posts by user
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of blog posts by the user
 */
router.get(
  "/user/:userId",
  [
    param("userId").isMongoId().withMessage("Valid user ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const posts = await Post.find({ userId: req.params.userId });
      res.status(200).json(posts);
    } catch (err) {
      res
        .status(500)
        .json({ error: "User posts retrieval failed", details: err });
    }
  }
);

module.exports = router;
