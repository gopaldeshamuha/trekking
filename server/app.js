
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');

// Rate limiting
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required!');
  process.exit(1);
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required!');
  process.exit(1);
}

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
const GALLERY_PATH = path.join(__dirname, 'gallery.json');

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Helmet.js security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.cdnfonts.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.cdnfonts.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true // This removes X-Powered-By header
}));

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet.js handles all security headers automatically
// No need for duplicate custom security middleware

// Middleware - Moving these to top before routes
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Admin authentication routes
app.post('/api/admin/login', authLimiter, (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '600s' }); // 10 minutes in seconds
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ valid: true });
});

// --- Trail Moments Gallery API ---
// GET /api/gallery - Get gallery image URLs
app.get('/api/gallery', (req, res) => {
  fs.readFile(GALLERY_PATH, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return default 6 empty slots
      return res.json(['','','','','','']);
    }
    try {
      const images = JSON.parse(data);
      if (Array.isArray(images)) return res.json(images);
      return res.json(['','','','','','']);
    } catch {
      return res.json(['','','','','','']);
    }
  });
});

// POST /api/gallery - Update gallery image URLs
app.post('/api/gallery', (req, res) => {
  console.log('Received gallery update request:', req.body);
  
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return res.status(400).json({ error: 'Invalid request body' });
  }
  
  const { images } = req.body;
  
  if (!Array.isArray(images)) {
    console.error('Images is not an array:', images);
    return res.status(400).json({ error: 'Images must be an array' });
  }
  
  if (images.length !== 6) {
    console.error('Wrong array length:', images.length);
    return res.status(400).json({ error: 'Images must be an array of exactly 6 URLs' });
  }
  
  if (!images.every(img => typeof img === 'string')) {
    console.error('Not all items are strings:', images);
    return res.status(400).json({ error: 'All items must be strings' });
  }

  // Ensure directory exists
  const dir = path.dirname(GALLERY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFile(GALLERY_PATH, JSON.stringify(images, null, 2), 'utf8', err => {
    if (err) {
      console.error('Error saving gallery:', err);
      return res.status(500).json({ error: 'Failed to save gallery: ' + err.message });
    }
    console.log('Gallery updated successfully');
    res.json({ message: 'Gallery updated.' });
  });
});

// GET /api/feedback - Fetch all feedback entries (latest first)
app.get('/api/feedback', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC, id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Error fetching feedback.' });
  }
});


// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234567890',
  database: process.env.DB_NAME || 'ronins_treks',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware has been moved to the top of the file

/* ------------------- ROUTES ------------------- */

// POST /api/feedback - Save user feedback
app.post('/api/feedback', async (req, res) => {
  const { feedback } = req.body;
  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return res.status(400).json({ error: 'Feedback cannot be empty.' });
  }
  // Limit to 100 words (enforced on frontend, but double-check here)
  const words = feedback.trim().split(/\s+/).filter(Boolean);
  if (words.length > 100) {
    return res.status(400).json({ error: 'Feedback must be 100 words or less.' });
  }
  try {
    await pool.query('INSERT INTO feedback (feedback) VALUES (?)', [feedback.trim()]);
    res.status(201).json({ message: 'Feedback submitted successfully.' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Error saving feedback.' });
  }
});

// GET /api/business-queries - Fetch all business queries
app.get('/api/business-queries', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM business_queries ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching business queries:', err);
    res.status(500).json({ error: 'Error fetching business queries' });
  }
});

// POST /api/business-queries - Submit a new business query
app.post('/api/business-queries', async (req, res) => {
  const { name, email, phone, message } = req.body;
  
  // Validate required fields
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  
  // Email format validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  
  // Phone format validation
  if (!/^[0-9\-\+\s]{8,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }
  
  try {
    await pool.query(
      'INSERT INTO business_queries (name, email, phone, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, phone, message]
    );
    res.status(201).json({ message: 'Query submitted successfully.' });
  } catch (err) {
    console.error('Error saving business query:', err);
    res.status(500).json({ error: 'Error saving query.' });
  }
});

// GET /api/treks - Fetch all trek data
app.get('/api/treks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM treks ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching treks:', err);
    res.status(500).json({ error: 'Error fetching treks' });
  }
});

// PATCH: Add price to treks if missing (for legacy DBs)
app.patch('/api/treks/:id/price', async (req, res) => {
  const trekId = req.params.id;
  const { price } = req.body;
  if (!price) return res.status(400).json({ error: 'Missing price' });
  try {
    await pool.query('UPDATE treks SET price = ? WHERE id = ?', [price, trekId]);
    res.json({ message: 'Price updated' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating price' });
  }
});

// GET /api/treks/:id - Fetch single trek by ID
app.get('/api/treks/:id', async (req, res) => {
  const trekId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM treks WHERE id = ?', [trekId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching trek:', err);
    res.status(500).json({ error: 'Error fetching trek' });
  }
});

// ADMIN: Add new trek
app.post('/api/treks', async (req, res) => {
  const { name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image, price } = req.body;
  if (!name || !description || !duration || !trek_length || !difficulty || !max_altitude || !base_village || !transport || !meals || !sightseeing || !image) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO treks (name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image, price || 1999]
    );
    res.status(201).json({ message: 'Trek added', id: result.insertId });
  } catch (err) {
    console.error('Error adding trek:', err);
    res.status(500).json({ error: 'Error adding trek' });
  }
});

// PATCH /api/treks/:id/image - Update trek image
app.patch('/api/treks/:id/image', async (req, res) => {
  const trekId = req.params.id;
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Missing image URL' });
  try {
    await pool.query('UPDATE treks SET image = ? WHERE id = ?', [image, trekId]);
    res.json({ message: 'Image updated' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating image' });
  }
});

// ADMIN: Delete trek
app.delete('/api/treks/:id', async (req, res) => {
  const trekId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Delete any associated bookings first
    await connection.query('DELETE FROM bookings WHERE trek_id = ?', [trekId]);
    // Then delete the trek
    await connection.query('DELETE FROM treks WHERE id = ?', [trekId]);
    await connection.commit();
    res.json({ message: 'Trek deleted' });
  } catch (err) {
    await connection.rollback();
    console.error('Error deleting trek:', err);
    res.status(500).json({ error: 'Error deleting trek' });
  } finally {
    connection.release();
  }
});

// ADMIN: Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
});

// ADMIN: Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;
  try {
    await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Error deleting booking' });
  }
});

// POST /api/bookings - Insert booking information
app.post('/api/bookings', async (req, res) => {
  const { trek_id, trekName, fullName, contact, email, groupSize, notes } = req.body;
  // Validate required fields
  if (!trek_id || !trekName || !fullName || !contact || !email) {
    return res.status(400).json({ 
      error: 'Missing required fields: trek_id, trekName, fullName, contact, email' 
    });
  }
  // Email format validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  // Phone format validation
  if (!/^[0-9\-\+\s]{8,20}$/.test(contact)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  try {
    // Check if trek exists
    const [trekRows] = await pool.query('SELECT id FROM treks WHERE id = ?', [trek_id]);
    if (trekRows.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }
    // Insert booking
    const [result] = await pool.query(
      'INSERT INTO bookings (trek_id, trekName, fullName, contact, email, groupSize, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [trek_id, trekName, fullName, contact, email, groupSize || 1, notes || null]
    );
    res.status(201).json({ 
      message: 'Booking created successfully',
      bookingId: result.insertId 
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Error creating booking' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Security headers test endpoint
app.get('/api/security-test', (req, res) => {
  res.json({ 
    message: 'Security headers test',
    headers: {
      'X-Frame-Options': res.getHeader('X-Frame-Options'),
      'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
      'X-XSS-Protection': res.getHeader('X-XSS-Protection'),
      'Content-Security-Policy': res.getHeader('Content-Security-Policy'),
      'Strict-Transport-Security': res.getHeader('Strict-Transport-Security'),
      'Permissions-Policy': res.getHeader('Permissions-Policy')
    },
    timestamp: new Date().toISOString()
  });
});

// Robots.txt endpoint (explicit serving)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

// Security.txt endpoint
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/.well-known/security.txt'));
});

// Catch-all handler for frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
