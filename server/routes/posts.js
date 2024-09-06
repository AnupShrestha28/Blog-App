const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const verifyToken = require("../middleware/verifyToken");
const logger = require("../utils/logger");

// Middleware to handle validation errors and logging
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation Error: ", errors.array());
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
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      .withMessage("Categories must be an array"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { title, desc, username, userId, photo, categories } = req.body;

      const newPost = new Post({
        title,
        desc,
        username,
        userId,
        photo,
        categories,
      });
      const savedPost = await newPost.save();
      logger.info(`New post created by user ${userId}: ${title}`);
      res.status(200).json(savedPost);
    } catch (err) {
      logger.error("Error creating post: ", err);
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
 *                 description: New title of the post
 *               desc:
 *                 type: string
 *                 description: New description of the post
 *     responses:
 *       200:
 *         description: The updated blog post
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      logger.info(`Post updated: ${req.params.id}`);
      res.status(200).json(updatedPost);
    } catch (err) {
      logger.error("Error updating post: ", err);
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
 *         description: Post has been deleted
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      logger.info(`Post deleted: ${req.params.id}`);
      res.status(200).json("Post has been deleted!");
    } catch (err) {
      logger.error("Error deleting post: ", err);
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
 *         description: Blog post details
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      logger.info(`Post retrieved: ${req.params.id}`);
      res.status(200).json(post);
    } catch (err) {
      logger.error("Error retrieving post: ", err);
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
 *         description: Search query for filtering posts by title
 *     responses:
 *       200:
 *         description: List of blog posts
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      logger.info("All posts retrieved");
      res.status(200).json(posts);
    } catch (err) {
      logger.error("Error retrieving posts: ", err);
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
 *         description: List of blog posts by the user
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
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
      logger.info(`Posts retrieved for user: ${req.params.userId}`);
      res.status(200).json(posts);
    } catch (err) {
      logger.error("Error retrieving user's posts: ", err);
      res.status(500).json({ error: "Posts retrieval failed", details: err });
    }
  }
);

module.exports = router;
