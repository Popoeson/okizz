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
// Ticket
const ticketSchema = new mongoose.Schema(
  { image: String, name: String, description: String, price: Number },
  { timestamps: true }
);
const Ticket = mongoose.model("Ticket", ticketSchema);

// Artiste
const artisteSchema = new mongoose.Schema(
  { image: String, name: String },
  { timestamps: true }
);
const Artiste = mongoose.model("Artiste", artisteSchema);

// Hero
const heroSchema = new mongoose.Schema(
  { image: String, active: { type: Boolean, default: false } },
  { timestamps: true }
);
const Hero = mongoose.model("Hero", heroSchema);

// Order
const orderSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,
    items: [
      {
        ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
        name: String,
        price: Number,
        quantity: Number
      }
    ],
    totalAmount: Number,
    paymentReference: String,
    paymentStatus: { type: String, enum: ["pending","paid","failed"], default: "pending" }
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderSchema);

/* =====================
   TICKETS ROUTES
===================== */
app.post("/api/tickets", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "concert_tickets" }
    );
    const ticket = await Ticket.create({ image: uploadRes.secure_url, name, description, price });
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

app.get("/api/tickets", async (req, res) => {
  res.json(await Ticket.find().sort({ createdAt: -1 }));
});

// NEW: GET single ticket by ID
app.get("/api/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

app.put("/api/tickets/:id", upload.single("image"), async (req, res) => {
  try {
    let update = req.body;
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "concert_tickets" }
      );
      update.image = uploadRes.secure_url;
    }
    const updated = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

app.delete("/api/tickets/:id", async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

/* =====================
   ARTISTES ROUTES
===================== */
app.post("/api/artistes", upload.single("image"), async (req, res) => {
  try {
    const uploadRes = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "concert_artistes" }
    );
    const artiste = await Artiste.create({ image: uploadRes.secure_url, name: req.body.name });
    res.status(201).json(artiste);
  } catch (err) {
    res.status(500).json({ error: "Failed to create artiste" });
  }
});

app.get("/api/artistes", async (req, res) => {
  res.json(await Artiste.find().sort({ createdAt: -1 }));
});

// NEW: GET single artiste by ID
app.get("/api/artistes/:id", async (req, res) => {
  try {
    const artiste = await Artiste.findById(req.params.id);
    if (!artiste) return res.status(404).json({ error: "Artiste not found" });
    res.json(artiste);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch artiste" });
  }
});

// NEW: PUT artiste
app.put("/api/artistes/:id", upload.single("image"), async (req, res) => {
  try {
    let update = { name: req.body.name };
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "concert_artistes" }
      );
      update.image = uploadRes.secure_url;
    }
    const updated = await Artiste.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update artiste" });
  }
});

app.delete("/api/artistes/:id", async (req, res) => {
  try {
    await Artiste.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete artiste" });
  }
});

/* =====================
   HERO ROUTES
===================== */
const heroRouter = express.Router();

heroRouter.get("/", async (_, res) => res.json(await Hero.find().sort({ createdAt: -1 })));
heroRouter.get("/:id", async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    if (!hero) return res.status(404).json({ error: "Hero not found" });
    res.json(hero);
  } catch {
    res.status(500).json({ error: "Failed to fetch hero" });
  }
});
heroRouter.post("/", upload.single("image"), async (req, res) => {
  const uploadRes = await cloudinary.uploader.upload(
    `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
    { folder: "concert_hero" }
  );
  res.status(201).json(await Hero.create({ image: uploadRes.secure_url }));
});
heroRouter.put("/:id", upload.single("image"), async (req, res) => {
  try {
    let update = {};
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "concert_hero" }
      );
      update.image = uploadRes.secure_url;
    }
    const updated = await Hero.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update hero" });
  }
});
heroRouter.patch("/:id/toggle", async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    await Hero.updateMany({}, { active: false });
    hero.active = !hero.active;
    await hero.save();
    res.json(hero);
  } catch {
    res.status(500).json({ error: "Failed to toggle hero" });
  }
});
heroRouter.delete("/:id", async (req, res) => {
  try {
    await Hero.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete hero" });
  }
});

app.use("/api/hero", heroRouter);

/* =====================
   CHECKOUT & PAYSTACK
===================== */
// CREATE ORDER
app.post("/api/orders", async (req, res) => {
  try {
    const { name, phone, email, items } = req.body;
    let total = 0;
    items.forEach(i => (total += i.price * i.quantity));
    const order = await Order.create({ name, phone, email, items, totalAmount: total });
    res.json(order);
  } catch {
    res.status(500).json({ error: "Failed to create order" });
  }
});

// INITIALIZE PAYMENT
app.post("/api/paystack/init", async (req, res) => {
  try {
    const { email, amount, orderId } = req.body;
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount: amount * 100, metadata: { orderId } },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "Payment init failed" });
  }
});

// VERIFY PAYMENT
app.get("/api/paystack/verify/:reference", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = response.data.data;
    if (data.status === "success") {
      await Order.findByIdAndUpdate(data.metadata.orderId, {
        paymentStatus: "paid",
        paymentReference: data.reference
      });
    }
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "Verification failed" });
  }
});

/* =====================
   SERVER
===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));