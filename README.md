# The Ronins - Full-Stack Trekking Website

A modern, responsive trekking website built with Node.js, Express, MySQL, and vanilla JavaScript. Features a beautiful dark theme with purple/pink gradients, dynamic trek listings, and a complete booking system.

## 🌟 Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dynamic Trek Listings**: Fetches trek data from MySQL database
- **Interactive Booking System**: Modal-based booking with form validation
- **Search & Filter**: Find treks by name, location, or difficulty
- **Modern UI**: Dark theme with gradient accents and smooth animations
- **RESTful API**: Clean API endpoints for data management
- **Database Integration**: MySQL with proper schema and relationships

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

### Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   ```bash
   # Login to MySQL
   mysql -u root -p
   
   # Import the database schema and data
   mysql -u root -p < db_init.sql
   ```

4. **Configure environment variables** (optional)
   - Update database credentials in `server/app.js` if needed
   - Default settings: host=localhost, user=root, password='', database=ronins_treks

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - The website should load with sample trek data

## 📁 Project Structure

```
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── style.css          # Responsive CSS with modern design
│   └── script.js          # Frontend JavaScript logic
├── server/                # Backend files
│   └── app.js            # Express server with API endpoints
├── db_init.sql           # Database schema and sample data
├── package.json          # Node.js dependencies and scripts
├── package-lock.json     # Dependency lock file
└── README.md             # This file
```

## 🔧 API Endpoints

### GET /api/treks
Returns all available treks in JSON format.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Kalu Waterfall Trek",
    "description": "A scenic trek near Pune...",
    "duration": 2,
    "trek_length": 13.0,
    "difficulty": "Moderate",
    "max_altitude": 2000,
    "base_village": "Malavli Village",
    "transport": "Shared vehicle from Pune",
    "meals": "Breakfast, Lunch",
    "sightseeing": "Kalu Waterfall, Sunset viewpoint, Natural pools",
    "image": "https://images.unsplash.com/..."
  }
]
```

### POST /api/bookings
Creates a new booking record.

**Request Body:**
```json
{
  "trek_id": 1,
  "fullName": "John Doe",
  "contact": "+91 9876543210",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "message": "Booking created successfully",
  "bookingId": 1
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-08-17T08:03:59.637Z"
}
```

## 🗄️ Database Schema

### treks table
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `name` (VARCHAR(255), NOT NULL)
- `description` (TEXT)
- `duration` (INT) - Duration in days
- `trek_length` (DOUBLE) - Length in kilometers
- `difficulty` (VARCHAR(50)) - Easy/Moderate/Challenging
- `max_altitude` (INT) - Maximum altitude in feet
- `base_village` (VARCHAR(255))
- `transport` (VARCHAR(255))
- `meals` (VARCHAR(255))
- `sightseeing` (TEXT)
- `image` (VARCHAR(500)) - Image URL

### bookings table
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `trek_id` (INT, FOREIGN KEY to treks.id)
- `fullName` (VARCHAR(255), NOT NULL)
- `contact` (VARCHAR(20), NOT NULL)
- `email` (VARCHAR(255), NOT NULL)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

## 🎨 Design Features

- **Dark Theme**: Professional dark background with purple/pink gradients
- **Mountain Background**: Hero section with stunning mountain imagery
- **Floating Logo**: Animated logo with subtle floating effect
- **Responsive Grid**: Trek cards adapt to different screen sizes
- **Modal System**: Detailed trek information in overlay modals
- **Smooth Animations**: Hover effects and transitions throughout
- **Modern Typography**: Clean, readable fonts with proper hierarchy

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+ (3-column trek grid)
- **Tablet**: 768px-1199px (2-column trek grid)
- **Mobile**: <768px (1-column trek grid, mobile navigation)

## 🔒 Security Features

- Input validation on all forms
- SQL injection prevention with parameterized queries
- CORS enabled for cross-origin requests
- Error handling with appropriate HTTP status codes

## 🚀 Deployment Options

### Option 1: Traditional Hosting (VPS/Dedicated Server)
1. Upload files to server
2. Install Node.js and MySQL
3. Run `npm install` and `npm start`
4. Configure reverse proxy (nginx/Apache) if needed

### Option 2: Cloud Platforms
- **Heroku**: Add Procfile and use ClearDB MySQL addon
- **DigitalOcean App Platform**: Configure build and run commands
- **AWS EC2**: Full control deployment with RDS for MySQL
- **Railway**: Simple deployment with MySQL addon

### Option 3: Containerization
- Create Dockerfile for Node.js app
- Use docker-compose for app + MySQL
- Deploy to any container platform

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Adding New Treks

1. Insert data into the `treks` table:
   ```sql
   INSERT INTO treks (name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image) 
   VALUES ('Trek Name', 'Description...', 3, 15.5, 'Moderate', 3000, 'Village', 'Transport', 'Meals', 'Sights', 'image_url');
   ```

2. The frontend will automatically display the new trek

### Customization

- **Colors**: Update CSS variables in `:root` selector in `style.css`
- **Images**: Replace Unsplash URLs with your own images
- **Content**: Modify text content in `index.html`
- **Functionality**: Extend API endpoints in `server/app.js`

## 📞 Support

For questions or issues:
- Check the console for error messages
- Verify MySQL connection and database setup
- Ensure all dependencies are installed
- Check that port 3000 is available

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ for adventure enthusiasts**

