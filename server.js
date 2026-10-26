
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const routes = require("./routes/index");
const db = require("./config/db");

const app = express();
const port = process.env.PORT || 5000;

db();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API routes
app.use("/api", routes);

app.listen(port, (err) => {
  if (!err) {
    console.log(`Server started on http://localhost:${port}`);
  }
});
