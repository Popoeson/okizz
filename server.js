require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   DATABASE
===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

/* =====================
   CLOUDINARY CONFIG
===================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =====================
   MULTER CONFIG
===================== */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =====================
   SCHEMAS
===================== */

// 🎟 Ticket Schema
const ticketSchema = new mongoose.Schema(
  {
    image: String,
    name: String,
    description: String,
    price: Number
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

// 🎤 Artiste Schema
const artisteSchema = new mongoose.Schema(
  {
    image: String,
    name: String
  },
  { timestamps: true }
);

const Artiste = mongoose.model("Artiste", artisteSchema);

/* =====================
   ROUTES
===================== */

/* -------- TICKETS -------- */

// Create Ticket
app.post("/api/tickets", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "Image is required" });

    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "concert_tickets" }
    );

    const ticket = new Ticket({
      image: uploadRes.secure_url,
      name,
      description,
      price
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// Get All Tickets
app.get("/api/tickets", async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json(tickets);
});

// Delete Ticket
app.delete("/api/tickets/:id", async (req, res) => {
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* -------- ARTISTES -------- */

// Create Artiste
app.post("/api/artistes", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!req.file)
      return res.status(400).json({ error: "Image is required" });

    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "concert_artistes" }
    );

    const artiste = new Artiste({
      image: uploadRes.secure_url,
      name
    });

    await artiste.save();
    res.status(201).json(artiste);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create artiste" });
  }
});

// Get All Artistes
app.get("/api/artistes", async (req, res) => {
  const artistes = await Artiste.find().sort({ createdAt: -1 });
  res.json(artistes);
});

// Delete Artiste
app.delete("/api/artistes/:id", async (req, res) => {
  await Artiste.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* =====================
   SERVER
===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);