const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
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
 * /api/users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
// UPDATE
router.put(
  "/:id",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Valid user ID is required"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("email").optional().isEmail().withMessage("Invalid email address"),
    body("username")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
      logger.info(`User updated: ${req.params.id}`);
      res.status(200).json(updatedUser);
    } catch (err) {
      logger.error("Error updating user: ", err);
      res.status(500).json({ error: "User update failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// DELETE
router.delete(
  "/:id",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Valid user ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        logger.warn(`User not found: ${req.params.id}`);
        return res.status(404).json("User not found");
      }

      await User.findByIdAndDelete(req.params.id);
      await Post.deleteMany({ userId: req.params.id });
      await Comment.deleteMany({ userId: req.params.id });
      logger.info(`User deleted: ${req.params.id}`);
      res.status(200).json("User has been deleted!");
    } catch (err) {
      logger.error("Error deleting user: ", err);
      res.status(500).json({ error: "User deletion failed", details: err });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
// GET USER
router.get(
  "/:id",
  [
    param("id").isMongoId().withMessage("Valid user ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        logger.warn(`User not found: ${req.params.id}`);
        return res.status(404).json("User not found");
      }

      const { password, ...info } = user._doc;
      logger.info(`User retrieved: ${req.params.id}`);
      res.status(200).json(info);
    } catch (err) {
      logger.error("Error retrieving user: ", err);
      res.status(500).json({ error: "User retrieval failed", details: err });
    }
  }
);

module.exports = router;
