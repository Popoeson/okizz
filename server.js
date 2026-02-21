// =====================
// server.js (Concert Ticketing)
// =====================
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const axios = require("axios");

const app = express();

// =====================
// Middleware
// =====================
app.use(cors({
  origin: "https://okizz.vercel.app", // frontend
  credentials: true
}));
app.use(express.json());

// =====================
// MongoDB Connection
// =====================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// =====================
// Cloudinary Config
// =====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =====================
// Multer Config
// =====================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =====================
// Helper: Cloudinary Upload
// =====================
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// =====================
// SCHEMAS
// =====================

// ---- Concert Event ----
const eventSchema = new mongoose.Schema({
  title: String,
  date: String,
  venue: String,
  description: String,
  bannerImage: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

// ---- Ticket Schema ----
const ticketSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
}, { timestamps: true });

const Ticket = mongoose.model("Ticket", ticketSchema);

// ---- Ticket Order ----
const orderSchema = new mongoose.Schema({
  orderId: String,
  reference: String,
  eventId: mongoose.Schema.Types.ObjectId,
  ticketType: String,
  quantity: Number,
  amount: Number,
  buyer: {
    name: String,
    email: String,
    phone: String
  },
  status: { type: String, default: "paid" },
  checkedIn: { type: Boolean, default: false }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

// =====================
// ROUTES
// =====================

// =====================
// EVENT MANAGEMENT (ADMIN)
// =====================

// Create Event
app.post("/api/events", upload.single("image"), async (req, res) => {
  try {
    const { title, date, venue, description } = req.body;

    let imageUrl = "";
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "concert_events");
      imageUrl = uploadResult.secure_url;
    }

    const event = new Event({
      title,
      date,
      venue,
      description,
      bannerImage: imageUrl
    });

    await event.save();
    res.status(201).json(event);

  } catch (err) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Get Events
app.get("/api/events", async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  res.json(events);
});

// =====================
// TICKET MANAGEMENT
// =====================

// Create Ticket Type
app.post("/api/tickets", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price } = req.body;

    if (!req.file || !name || !description || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Upload image to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      "concert_tickets"
    );

    const ticket = new Ticket({
      image: result.secure_url,
      name,
      description,
      price: Number(price)
    });

    await ticket.save();
    res.status(201).json(ticket);

  } catch (err) {
    console.error("Create Ticket Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// =====================
// PAYSTACK
// =====================

// Initialize Payment
app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, metadata } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount, metadata },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference
    });

  } catch (err) {
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

// Verify Payment
app.get("/api/paystack/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      const meta = data.metadata;

      const order = new Order({
        orderId: `TICKET-${Date.now()}`,
        reference,
        eventId: meta.eventId,
        ticketType: meta.ticketType,
        quantity: meta.quantity,
        amount: data.amount / 100,
        buyer: meta.buyer
      });

      await order.save();

      // reduce ticket availability
      await Ticket.findOneAndUpdate(
        { eventId: meta.eventId, name: meta.ticketType },
        { $inc: { available: -meta.quantity } }
      );

      res.json({ status: "success", orderId: order.orderId });
    } else {
      res.status(400).json({ status: "failed" });
    }

  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// =====================
// ADMIN DASHBOARD
// =====================

// Get All Orders
app.get("/api/orders", async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// Check-in Ticket
app.patch("/api/orders/:id/checkin", async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { checkedIn: true },
    { new: true }
  );
  res.json(order);
});

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));