const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "eventluxurysecret",
    resave: false,
    saveUninitialized: false
}));

// =====================
// DATABASE CONNECTION
// =====================
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "event_lifecycle"
});

db.connect(err => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

// =====================
// USER ROUTES
// =====================

// Register
app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.json({ message: "All fields required!" });
    }
    db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, password],
        (err) => {
            if (err) return res.json({ message: "Email already exists!" });
            res.json({ message: "Registration successful!" });
        }
    );
});

// Login
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    db.query(
        "SELECT * FROM users WHERE email=? AND password=?",
        [email, password],
        (err, results) => {
            if (results.length > 0) {
                req.session.user = results[0];
                res.json({ message: "Login successful!" });
            } else {
                res.json({ message: "Invalid credentials!" });
            }
        }
    );
});

// Logout
app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out successfully!" });
    });
});

// Get Logged-in User
app.get("/api/user", (req, res) => {
    if (req.session.user) res.json(req.session.user);
    else res.json(null);
});

// =====================
// EVENTS ROUTES
// =====================

// Get All Events
app.get("/api/events", (req, res) => {
    db.query("SELECT * FROM events", (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

// =====================
// BOOKINGS ROUTES
// =====================

// Book Event (Confirmed)
app.post("/api/book", (req, res) => {
    if (!req.session.user) return res.json({ message: "Please login first!" });

    const user_id = req.session.user.id;
    const { event_id } = req.body;

    db.query(
        "INSERT INTO bookings (user_id, event_id, status) VALUES (?, ?, 'confirmed')",
        [user_id, event_id],
        (err) => {
            if (err) {
                console.error(err);
                return res.json({ message: "Booking failed!" });
            }
            res.json({ message: "🎟 Booking Confirmed!" });
        }
    );
});

// Get Confirmed Bookings for Logged-in User
app.get("/api/mybookings", (req, res) => {
    if (!req.session.user) return res.json({ message: "Please login first!" });

    const user_id = req.session.user.id;

    db.query(
        `SELECT b.id, e.title, e.location, e.event_date, e.price, b.status
         FROM bookings b
         JOIN events e ON b.event_id = e.id
         WHERE b.user_id = ? AND b.status = 'confirmed'`,
        [user_id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not fetch bookings" });
            }
            res.json(results);
        }
    );
});

// =====================
// START SERVER
// =====================
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));