-- GPS Schema Migration Script
-- This script updates the existing database to match the API expectations
-- Run this script to update your existing database

USE ronins_treks;

-- Step 1: Update live_treks table to match API expectations
-- Add new columns if they don't exist
ALTER TABLE live_treks 
ADD COLUMN IF NOT EXISTS driver_id VARCHAR(255) AFTER trek_id,
ADD COLUMN IF NOT EXISTS active_since TIMESTAMP NULL AFTER is_active,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP NULL AFTER active_since,
ADD COLUMN IF NOT EXISTS status_message TEXT AFTER last_location_update;

-- Step 2: Migrate data from old columns to new columns
-- Copy driver_name to driver_id if driver_id is NULL
UPDATE live_treks 
SET driver_id = driver_name 
WHERE driver_id IS NULL AND driver_name IS NOT NULL;

-- Copy last_location_time to last_location_update if last_location_update is NULL
UPDATE live_treks 
SET last_location_update = last_location_time 
WHERE last_location_update IS NULL AND last_location_time IS NOT NULL;

-- Step 3: Create live_trek_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS live_trek_settings (
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
-- This will create settings for any existing live treks that have trek_password
INSERT IGNORE INTO live_trek_settings (trek_id, tracking_password, chat_enabled, chat_locked)
SELECT 
  trek_id, 
  trek_password, 
  TRUE, 
  FALSE
FROM live_treks 
WHERE trek_password IS NOT NULL AND trek_password != '';

-- Step 5: Optional - Remove old columns after migration (commented out for safety)
-- Uncomment these lines only after confirming everything works correctly
-- ALTER TABLE live_treks DROP COLUMN IF EXISTS driver_name;
-- ALTER TABLE live_treks DROP COLUMN IF EXISTS driver_password;
-- ALTER TABLE live_treks DROP COLUMN IF EXISTS trek_password;
-- ALTER TABLE live_treks DROP COLUMN IF EXISTS last_location_time;

-- Step 6: Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT 'live_treks table structure:' as info;
DESCRIBE live_treks;
SELECT 'live_trek_settings table structure:' as info;
DESCRIBE live_trek_settings;
