-- Database initialization script for The Ronins trekking website
-- Create database and tables

CREATE DATABASE IF NOT EXISTS ronins_treks;
USE ronins_treks;

-- Create treks table
CREATE TABLE IF NOT EXISTS treks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  duration VARCHAR(100),
  trek_length DOUBLE,
  difficulty VARCHAR(50),
  max_altitude INT,
  base_village VARCHAR(255),
  transport VARCHAR(255),
  meals VARCHAR(255),
  sightseeing TEXT,
  image VARCHAR(500),
  price INT DEFAULT 1999
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trek_id INT NOT NULL,
  trekName VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  groupSize INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trek_id) REFERENCES treks(id)
);

-- Create business_queries table for Contact Us form
CREATE TABLE IF NOT EXISTS business_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample trek data
INSERT IGNORE INTO treks (name, description, duration, trek_length, difficulty, max_altitude, base_village, transport, meals, sightseeing, image) VALUES
('Kalu Waterfall Trek', 'A scenic trek near Pune through lush forests leading to a 300-foot waterfall. Best after monsoon when the falls are full. Enjoy a refreshing dip in natural pools and witness breathtaking sunset views from the top.', 2, 13.0, 'Moderate', 2000, 'Malavli Village', 'Shared vehicle from Pune', 'Breakfast, Lunch', 'Kalu Waterfall, Sunset viewpoint, Natural pools', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1400&auto=format&fit=crop'),

('Kedarkantha Trek', 'A famous winter trek in the Garhwal Himalayas reaching up to 12,500 ft. Pass through charming villages and dense forests of oak and cedar. Experience panoramic views of majestic peaks like Bandarpunch and Swargarohini.', 4, 24.0, 'Easy', 12500, 'Gusainkunda', 'Bus to Sankri base camp', 'All meals included', 'Oak and Cedar forests, Panoramic Himalayan views, Snow-capped peaks', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1400&auto=format&fit=crop'),

('Goecha La Trek', 'A challenging high-altitude trek to Goecha La pass near the mighty Kanchenjunga. Journey through pristine rhododendron forests and stunning alpine valleys. Witness the third highest peak in the world up close.', 9, 102.0, 'Challenging', 14873, 'Yuksom', 'Shared Jeep to base', 'All meals included', 'Kanchenjunga Base Camp, Alpine valleys, Rhododendron forests', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400&auto=format&fit=crop'),

('Bhrigu Lake Trek', 'A moderate 3-day trek to the beautiful alpine Bhrigu Lake at 14,000 ft. Hike through dense cedar forests and expansive high-altitude meadows. Camp beside the crystal-clear lake beneath the towering Deo Tibba peak.', 3, 16.0, 'Moderate', 14000, 'Gulaba', 'Shared Taxi from Manali', 'All meals included', 'Bhrigu Lake, Deo Tibba peak views, Alpine meadows', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop'),

('Tarsar Marsar Trek', 'A spectacular 7-day Kashmir trek to the twin alpine lakes of Tarsar and Marsar. The route passes through dense forests, lush meadows, and a high-altitude pass at 13,500 ft. Camp under starlit skies beside moonlit lakes surrounded by snow-capped peaks.', 7, 45.0, 'Moderate', 13700, 'Aru Village', 'Shared Van from Srinagar', 'All meals included', 'Tarsar Lake, Marsar Lake, High-altitude alpine pass, Kashmir valleys', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop');

