-- GPS Schema Migration Script (MySQL Compatible)
-- This script updates the existing database to match the API expectations

USE ronins_treks;

-- Step 1: Add new columns to live_treks table (ignore errors if columns already exist)
ALTER TABLE live_treks ADD COLUMN driver_id VARCHAR(255) AFTER trek_id;
ALTER TABLE live_treks ADD COLUMN active_since TIMESTAMP NULL AFTER is_active;
ALTER TABLE live_treks ADD COLUMN last_location_update TIMESTAMP NULL AFTER active_since;
ALTER TABLE live_treks ADD COLUMN status_message TEXT AFTER last_location_update;

-- Step 2: Migrate data from old columns to new columns
UPDATE live_treks SET driver_id = driver_name WHERE driver_id IS NULL AND driver_name IS NOT NULL;
UPDATE live_treks SET last_location_update = last_location_time WHERE last_location_update IS NULL AND last_location_time IS NOT NULL;

-- Step 3: Create live_trek_settings table
CREATE TABLE live_trek_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trek_id INT NOT NULL,
  tracking_password VARCHAR(255) NOT NULL,
  chat_enabled BOOLEAN DEFAULT TRUE,
  chat_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_trek_settings (trek_id)
);

-- Step 4: Migrate existing trek passwords to live_trek_settings
INSERT IGNORE INTO live_trek_settings (trek_id, tracking_password, chat_enabled, chat_locked)
SELECT trek_id, trek_password, TRUE, FALSE
FROM live_treks 
WHERE trek_password IS NOT NULL AND trek_password != '';

-- Step 5: Show migration results
SELECT 'Migration completed successfully' as status;
SELECT 'live_treks table structure:' as info;
DESCRIBE live_treks;
SELECT 'live_trek_settings table structure:' as info;
DESCRIBE live_trek_settings;
