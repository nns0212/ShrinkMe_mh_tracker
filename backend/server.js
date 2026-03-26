const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const journalRoutes = require("./routes/journalRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/api/journals", journalRoutes);
app.use("/api/reports", reportRoutes);

async function startServer() {
  if (!mongoUri) {
    console.error("Missing MONGO_URI in backend environment.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.log("MongoDB Error:", err);
    process.exit(1);
  }
}

startServer();
