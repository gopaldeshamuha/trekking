-- GPS Tracking Tables Setup
USE ronins_treks;

-- Create live_treks table for tracking active GPS treks
CREATE TABLE IF NOT EXISTS live_treks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trek_id INT NOT NULL,
  driver_name VARCHAR(255),
  google_maps_link TEXT,
  driver_password VARCHAR(255),
  trek_password VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  last_location_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE
);

-- Create trek_locations table for storing GPS coordinates history
CREATE TABLE IF NOT EXISTS trek_locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trek_id INT NOT NULL,
  live_trek_id INT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  altitude DECIMAL(8, 2),
  speed DECIMAL(8, 2),
  heading DECIMAL(8, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE,
  FOREIGN KEY (live_trek_id) REFERENCES live_treks(id) ON DELETE CASCADE
);

-- Create gps_config table for storing global driver access password
CREATE TABLE IF NOT EXISTS gps_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default driver access password
INSERT INTO gps_config (config_key, config_value, description) 
VALUES ('driver_password', 'ronin2024', 'Default password for driver panel access')
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
updated_at = CURRENT_TIMESTAMP;

-- Show created tables
SHOW TABLES LIKE '%gps%';
SHOW TABLES LIKE '%live%';
SHOW TABLES LIKE '%trek%';

-- Show GPS config
SELECT * FROM gps_config;
