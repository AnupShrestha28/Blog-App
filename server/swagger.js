const option = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Blogging API",
      description: "A Blogging platform API with full CRUD operations",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: [
    "./routes/auth.js",
    "./routes/users.js",
    "./routes/posts.js",
    "./routes/comments.js",
  ],
};

module.exports = option;
