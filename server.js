require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
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
   HERO SCHEMA
===================== */
const heroSchema = new mongoose.Schema(
  {
    image: String,
    active: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Hero = mongoose.model("Hero", heroSchema);

/* =====================
   ORDER SCHEMA
===================== */
const orderSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,

    items: [
      {
        ticketId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Ticket"
        },
        name: String,
        price: Number,
        quantity: Number
      }
    ],

    totalAmount: Number,

    paymentReference: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);


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

// Update Ticket
app.put("/api/tickets/:id", upload.single("image"), async (req,res)=>{
  const { name, description, price } = req.body;
  let updateData = { name, description, price };

  if(req.file){
    const uploadRes = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`, { folder: "concert_tickets" });
    updateData.image = uploadRes.secure_url;
  }

  const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.json(ticket);
});

// Update Artiste
app.put("/api/artistes/:id", upload.single("image"), async (req,res)=>{
  const { name } = req.body;
  let updateData = { name };

  if(req.file){
    const uploadRes = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`, { folder: "concert_artistes" });
    updateData.image = uploadRes.secure_url;
  }

  const artiste = await Artiste.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.json(artiste);
});


/* =====================
   HERO ROUTES
===================== */
const heroRouter = express.Router();
const heroUpload = upload.single("image");

// GET all hero images
heroRouter.get("/", async (req, res) => {
  try {
    const heroes = await Hero.find().sort({ createdAt: -1 });
    res.json(heroes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hero images" });
  }
});

// GET single hero by ID
heroRouter.get("/:id", async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    if (!hero) return res.status(404).json({ error: "Hero not found" });
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hero" });
  }
});

// CREATE new hero image
heroRouter.post("/", heroUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });

    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "concert_hero" }
    );

    const hero = new Hero({ image: uploadRes.secure_url });
    await hero.save();
    res.status(201).json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create hero image" });
  }
});

// UPDATE hero image (replace)
heroRouter.put("/:id", heroUpload, async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    if (!hero) return res.status(404).json({ error: "Hero not found" });

    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "concert_hero" }
      );
      hero.image = uploadRes.secure_url;
    }

    await hero.save();
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update hero image" });
  }
});

// DELETE hero image
heroRouter.delete("/:id", async (req, res) => {
  try {
    await Hero.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete hero image" });
  }
});

// TOGGLE hero activation
heroRouter.patch("/:id/toggle", async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    if (!hero) return res.status(404).json({ error: "Hero not found" });

    // If activating, optionally deactivate others
    if (!hero.active) {
      await Hero.updateMany({}, { active: false });
    }

    hero.active = !hero.active;
    await hero.save();
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle hero" });
  }
});

// Mount heroRouter
app.use("/api/hero", heroRouter);

/* =====================
   SERVER
===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);