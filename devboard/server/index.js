const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { rateLimit } = require("express-rate-limit");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");

dotenv.config();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: { error: "Too many requests, please try again later." },
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

// Make io available to route handlers (req.app.get("io"))
app.set("io", io);

app.use(morgan("dev"));
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(limiter);

// CSRF protection via csurf middleware (cookie-based)
app.use(csrf({ cookie: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/github", require("./routes/github"));
app.use("/api/ai", require("./routes/ai"));

// Health check — no auth required
app.get("/api/health", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    memory: {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    },
  });
});

app.get("/", (req, res) => res.json({ message: "DevBoard API running 🚀" }));

const onlineSockets = new Set();

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  onlineSockets.add(socket.id);
  io.emit("users:online", onlineSockets.size);

  socket.on("disconnect", () => {
    onlineSockets.delete(socket.id);
    io.emit("users:online", onlineSockets.size);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    // change app.listen to server.listen
    server.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`),
    );
  })
  .catch((err) => console.error("❌ MongoDB error:", err));
