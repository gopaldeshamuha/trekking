
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
// PRODUCTION: Change to production port
const PORT = process.env.PORT || 3003;
//const PORT = process.env.PORT || 8080; // Use standard production port
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
      scriptSrcAttr: ["'unsafe-inline'"],
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
  hidePoweredBy: true, // This removes X-Powered-By header
  xssFilter: true // Enable XSS protection
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
  'http://localhost:3003',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3003'
  //'https://theronins.in',        // Add your production domain
  //'https://www.theronins.in',    // Add www version
  // Remove all localhost entries for production
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
        const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '3600s' }); // 600 minutes in seconds
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
app.post('/api/gallery', verifyAdmin, (req, res) => {
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

// --- Week Heroes (Team Members) API ---
// GET /api/team-members - Get all team members
app.get('/api/team-members', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM team_members ORDER BY display_order, id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: 'Error fetching team members' });
  }
});

// PUT /api/team-members/:id - Update team member
app.put('/api/team-members/:id', verifyAdmin, async (req, res) => {
  const memberId = req.params.id;
  const { name, role, image_url, instagram_url } = req.body;
  
  // Validate required fields
  if (!name || !role || !image_url || !instagram_url) {
    return res.status(400).json({ error: 'All fields are required: name, role, image_url, instagram_url' });
  }

  // Sanitize HTML to prevent XSS attacks
  const sanitizedName = sanitizeHtml(name.trim());
  const sanitizedRole = sanitizeHtml(role.trim());
  
  // Validate URLs
  try {
    new URL(image_url);
    new URL(instagram_url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    await pool.query(
      'UPDATE team_members SET name = ?, role = ?, image_url = ?, instagram_url = ? WHERE id = ?',
      [sanitizedName, sanitizedRole, image_url, instagram_url, memberId]
    );
    
    res.json({ message: 'Team member updated successfully' });
  } catch (err) {
    console.error('Error updating team member:', err);
    res.status(500).json({ error: 'Error updating team member' });
  }
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


// Validate required database environment variables
if (!process.env.DB_PASSWORD) {
  console.error('❌ DB_PASSWORD environment variable is required!');
  console.error('Please set DB_PASSWORD in your .env file');
  process.exit(1);
}

// HTML sanitization function to prevent XSS attacks
function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')    // Must be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ronins_treks',
  waitForConnections: true,
  connectionLimit: 200,
  queueLimit: 0
});

// Make database pool accessible to routes
app.set('db', pool);

// Import and register GPS tracking routes
const gpsRoutes = require('./gps-tracking-routes');
app.use('/api/gps', gpsRoutes);

// Middleware has been moved to the top of the file

/* ------------------- ROUTES ------------------- */

// POST /api/feedback - Save user feedback
app.post('/api/feedback', async (req, res) => {
  const { feedback } = req.body;
  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return res.status(400).json({ error: 'Feedback cannot be empty.' });
  }

  // Sanitize HTML to prevent XSS attacks
  const sanitizedFeedback = sanitizeHtml(feedback.trim());

  // Limit to 100 words (enforced on frontend, but double-check here)
  const words = sanitizedFeedback.split(/\s+/).filter(Boolean);
  if (words.length > 100) {
    return res.status(400).json({ error: 'Feedback must be 100 words or less.' });
  }
  try {
    await pool.query('INSERT INTO feedback (feedback) VALUES (?)', [sanitizedFeedback]);
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

  // Sanitize HTML to prevent XSS attacks
  const sanitizedName = sanitizeHtml(name.trim());
  const sanitizedMessage = sanitizeHtml(message.trim());
  
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
      [sanitizedName, email, phone, sanitizedMessage]
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

// Comprehensive validation function for trek data
function validateTrekData(data) {
  const errors = [];
  const sanitized = {};

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Trek name is required and must be a string');
  } else {
    const name = data.name.trim();
    if (name.length < 3 || name.length > 100) {
      errors.push('Trek name must be between 3 and 100 characters');
    } else {
      // Remove HTML tags and dangerous characters
      sanitized.name = name.replace(/[<>\"'&]/g, '');
    }
  }

  // Description validation
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required and must be a string');
  } else {
    const desc = data.description.trim();
    if (desc.length < 10 || desc.length > 2000) {
      errors.push('Description must be between 10 and 2000 characters');
    } else {
      sanitized.description = desc.replace(/[<>\"'&]/g, '');
    }
  }

  // Duration validation
  if (!data.duration || typeof data.duration !== 'string') {
    errors.push('Duration is required and must be a string');
  } else {
    const duration = data.duration.trim();
    if (duration.length < 1 || duration.length > 50) {
      errors.push('Duration must be between 1 and 50 characters');
    } else {
      sanitized.duration = duration.replace(/[<>\"'&]/g, '');
    }
  }

  // Trek length validation
  if (!data.trek_length || isNaN(data.trek_length)) {
    errors.push('Trek length must be a valid number');
  } else {
    const length = parseFloat(data.trek_length);
    if (length <= 0 || length > 1000) {
      errors.push('Trek length must be between 0.1 and 1000 km');
    } else {
      sanitized.trek_length = length;
    }
  }

  // Difficulty validation
  if (!data.difficulty || typeof data.difficulty !== 'string') {
    errors.push('Difficulty is required and must be a string');
  } else {
    const difficulty = data.difficulty.trim();
    const validDifficulties = ['Easy', 'Moderate', 'Challenging'];
    if (!validDifficulties.includes(difficulty)) {
      errors.push('Difficulty must be Easy, Moderate, or Challenging');
    } else {
      sanitized.difficulty = difficulty;
    }
  }

  // Max altitude validation
  if (!data.max_altitude || isNaN(data.max_altitude)) {
    errors.push('Max altitude must be a valid number');
  } else {
    const altitude = parseFloat(data.max_altitude);
    if (altitude <= 0 || altitude > 30000) {
      errors.push('Max altitude must be between 1 and 30000 ft');
    } else {
      sanitized.max_altitude = altitude;
    }
  }

  // Base village validation
  if (!data.base_village || typeof data.base_village !== 'string') {
    errors.push('Base village is required and must be a string');
  } else {
    const village = data.base_village.trim();
    if (village.length < 2 || village.length > 100) {
      errors.push('Base village must be between 2 and 100 characters');
    } else {
      sanitized.base_village = village.replace(/[<>\"'&]/g, '');
    }
  }

  // Transport validation
  if (!data.transport || typeof data.transport !== 'string') {
    errors.push('Transport is required and must be a string');
  } else {
    const transport = data.transport.trim();
    if (transport.length < 2 || transport.length > 200) {
      errors.push('Transport must be between 2 and 200 characters');
    } else {
      sanitized.transport = transport.replace(/[<>\"'&]/g, '');
    }
  }

  // Meals validation
  if (!data.meals || typeof data.meals !== 'string') {
    errors.push('Meals information is required and must be a string');
  } else {
    const meals = data.meals.trim();
    if (meals.length < 2 || meals.length > 200) {
      errors.push('Meals information must be between 2 and 200 characters');
    } else {
      sanitized.meals = meals.replace(/[<>\"'&]/g, '');
    }
  }

  // Sightseeing validation
  if (!data.sightseeing || typeof data.sightseeing !== 'string') {
    errors.push('Sightseeing information is required and must be a string');
  } else {
    const sightseeing = data.sightseeing.trim();
    if (sightseeing.length < 2 || sightseeing.length > 200) {
      errors.push('Sightseeing information must be between 2 and 200 characters');
    } else {
      sanitized.sightseeing = sightseeing.replace(/[<>\"'&]/g, '');
    }
  }

  // Image URL validation
  if (!data.image || typeof data.image !== 'string') {
    errors.push('Image URL is required and must be a string');
  } else {
    const image = data.image.trim();
    // Validate URL format and prevent malicious URLs
    try {
      const url = new URL(image);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Image URL must use HTTP or HTTPS protocol');
      } else if (url.hostname.includes('javascript:') || url.hostname.includes('data:')) {
        errors.push('Invalid image URL format');
      } else {
        sanitized.image = image;
      }
    } catch {
      errors.push('Invalid image URL format');
    }
  }

  // Price validation (optional field)
  if (data.price !== undefined && data.price !== null) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0 || price > 100000) {
      errors.push('Price must be between 0 and 100000');
    } else {
      sanitized.price = price;
    }
  } else {
    sanitized.price = 1999; // Default price
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// ADMIN: Add new trek
app.post('/api/treks', async (req, res) => {
  try {
    // Comprehensive validation and sanitization
    const validation = validateTrekData(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { sanitized } = validation;

    // Insert sanitized data into database
    const [result] = await pool.query(
      'INSERT INTO treks (name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sanitized.name,
        sanitized.description,
        sanitized.duration,
        sanitized.trek_length,
        sanitized.difficulty,
        sanitized.max_altitude,
        sanitized.base_village,
        sanitized.transport,
        sanitized.meals,
        sanitized.sightseeing,
        sanitized.image,
        sanitized.price
      ]
    );

    res.status(201).json({
      message: 'Trek added successfully',
      id: result.insertId,
      trek: sanitized
    });

  } catch (err) {
    console.error('Error adding trek:', err);

    // Handle specific database errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A trek with this name already exists' });
    }

    if (err.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ error: 'One or more fields exceed maximum length' });
    }

    // Generic error for other database issues
    res.status(500).json({ error: 'Unable to add trek. Please try again later.' });
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

  // Sanitize HTML to prevent XSS attacks
  const sanitizedTrekName = sanitizeHtml(trekName.trim());
  const sanitizedFullName = sanitizeHtml(fullName.trim());
  const sanitizedNotes = notes ? sanitizeHtml(notes.trim()) : null;

  try {
    // Check if trek exists
    const [trekRows] = await pool.query('SELECT id FROM treks WHERE id = ?', [trek_id]);
    if (trekRows.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }
    // Insert booking with sanitized data
    const [result] = await pool.query(
      'INSERT INTO bookings (trek_id, trekName, fullName, contact, email, groupSize, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [trek_id, sanitizedTrekName, sanitizedFullName, contact, email, groupSize || 1, sanitizedNotes]
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

// POST /api/contact - Handle contact form submissions
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  
  // Validate required fields
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, email, phone, message' 
    });
  }
  
  // Email format validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Phone format validation
  if (!/^[0-9\-\+\s]{8,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // Sanitize HTML to prevent XSS attacks
  const sanitizedName = sanitizeHtml(name.trim());
  const sanitizedMessage = sanitizeHtml(message.trim());

  try {
    // Insert contact query into business_queries table
    const [result] = await pool.query(
      'INSERT INTO business_queries (name, email, phone, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [sanitizedName, email, phone, sanitizedMessage]
    );
    
    res.status(201).json({ 
      message: 'Contact form submitted successfully',
      id: result.insertId 
    });
  } catch (err) {
    console.error('Error submitting contact form:', err);
    res.status(500).json({ error: 'Error submitting contact form' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GPS Tracking API Routes (already declared above)
app.use('/api/gps', gpsRoutes);

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
