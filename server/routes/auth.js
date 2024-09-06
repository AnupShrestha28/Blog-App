const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// Validation schema for registration
const registerValidation = [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Validation schema for login
const loginValidation = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Middleware to handle validation errors
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
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: User's username
 *         email:
 *           type: string
 *           description: User's email
 *         password:
 *           type: string
 *           description: User's password (hashed)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registers a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists or validation errors
 *       500:
 *         description: Server error
 */
router.post(
  "/register",
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Check if the username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (existingUser) {
        logger.warn(
          "Registration failed: Username or email already registered"
        );
        return res
          .status(400)
          .json({ message: "Username or email is already registered" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({ username, email, password: hashedPassword });
      const savedUser = await newUser.save();
      logger.info(`New user registered: ${email}`);
      res.status(201).json(savedUser);
    } catch (err) {
      logger.error("Error registering user: ", err);
      res.status(500).json(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Logs in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        logger.warn("Login failed: User not found with email ", email);
        return res.status(404).json("User not found!");
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        logger.warn("Login failed: Incorrect password for email ", email);
        return res.status(401).json("Wrong credentials!");
      }

      const token = jwt.sign(
        { _id: user._id, username: user.username, email: user.email },
        process.env.SECRET,
        { expiresIn: "3d" }
      );

      const { password: userPassword, ...info } = user._doc;
      logger.info(`User logged in successfully: ${email}`);
      res.cookie("token", token).status(200).json(info);
    } catch (err) {
      logger.error("Error logging in user: ", err);
      res.status(500).json(err);
    }
  }
);

// LOGOUT
router.get("/logout", async (req, res) => {
  try {
    res
      .clearCookie("token", { sameSite: "none", secure: true })
      .status(200)
      .send("User logged out successfully!");
    logger.info("User logged out successfully");
  } catch (err) {
    logger.error("Error logging out user: ", err);
    res.status(500).json(err);
  }
});

// REFETCH USER
router.get("/refetch", (req, res) => {
  const token = req.cookies.token;
  jwt.verify(token, process.env.SECRET, {}, (err, data) => {
    if (err) {
      logger.warn("Token verification failed: ", err);
      return res.status(404).json(err);
    }
    logger.info("User refetched successfully");
    res.status(200).json(data);
  });
});

module.exports = router;
