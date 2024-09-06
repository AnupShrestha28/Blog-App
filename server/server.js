const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan"); // For logging HTTP requests
const logger = require("./utils/logger"); // Winston logger for audit logs
const authRoute = require("./routes/auth");
const userRoute = require("./routes/users");
const postRoute = require("./routes/posts");
const commentRoute = require("./routes/comments");
const swaggerUI = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerOption = require("./swagger");
const jsDoc = swaggerJSDoc(swaggerOption);

dotenv.config();

// Swagger setup
app.use("/swagger", swaggerUI.serve, swaggerUI.setup(jsDoc));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    logger.info("Database connected successfully!"); // Log DB connection with Winston
  } catch (err) {
    logger.error("Database connection failed:", err); // Log DB connection error
  }
};

// Middlewares
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use("/images", express.static(path.join(__dirname, "/images")));

// Morgan middleware to log incoming requests
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()), 
    },
  })
);

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/comments", commentRoute);

// Image upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, req.body.img);
  },
});

const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.status(200).json("Image has been uploaded successfully!");
});

// Start server
app.listen(process.env.PORT, () => {
  connectDB();
  logger.info(`App running on port ${process.env.PORT}`);
});
