const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const Comment = require("../models/Comment");
const verifyToken = require("../middleware/verifyToken");
const logger = require("../utils/logger");

// Validation schema for creating a comment
const createCommentValidation = [
  body("comment").notEmpty().withMessage("Comment is required"),
  body("author").notEmpty().withMessage("Author is required"),
  body("postId").notEmpty().withMessage("Post ID is required"),
  body("userId").notEmpty().withMessage("User ID is required"),
];

// Validation schema for updating a comment
const updateCommentValidation = [
  body("comment").optional().notEmpty().withMessage("Comment cannot be empty"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - comment
 *         - author
 *         - postId
 *         - userId
 *       properties:
 *         comment:
 *           type: string
 *           description: The content of the comment
 *         author:
 *           type: string
 *           description: The author of the comment
 *         postId:
 *           type: string
 *           description: The ID of the post the comment belongs to
 *         userId:
 *           type: string
 *           description: The ID of the user who made the comment
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Comment creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Comment last update timestamp
 */

/**
 * @swagger
 * /api/comments/create:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.post(
  "/create",
  verifyToken,
  createCommentValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error("Validation Error in creating comment: ", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newComment = new Comment(req.body);
      const savedComment = await newComment.save();
      logger.info(`Comment created successfully: ${savedComment._id}`);
      res.status(200).json(savedComment);
    } catch (err) {
      logger.error("Error creating comment: ", err);
      res.status(500).json(err);
    }
  }
);

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.put("/:id", verifyToken, updateCommentValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation Error in updating comment: ", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updatedComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    logger.info(`Comment updated successfully: ${req.params.id}`);
    res.status(200).json(updatedComment);
  } catch (err) {
    logger.error("Error updating comment: ", err);
    res.status(500).json(err);
  }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       500:
 *         description: Server error
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    logger.info(`Comment deleted successfully: ${req.params.id}`);
    res.status(200).json("Comment has been deleted!");
  } catch (err) {
    logger.error("Error deleting comment: ", err);
    res.status(500).json(err);
  }
});

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Get all comments for a specific post
 *     tags: [Comments]
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments for the post
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.get("/post/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId });
    logger.info(`Fetched comments for post ID: ${req.params.postId}`);
    res.status(200).json(comments);
  } catch (err) {
    logger.error("Error fetching comments: ", err);
    res.status(500).json(err);
  }
});

module.exports = router;
