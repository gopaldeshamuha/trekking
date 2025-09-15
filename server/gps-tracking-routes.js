const express = require('express');
const router = express.Router();

// GPS Tracking API Routes
// Handles all GPS-related endpoints for live trek tracking

// Get all treks for driver panel
router.get('/driver-treks', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Get treks with GPS tracking information (latest live_trek entry per trek)
    const [treks] = await db.query(`
      SELECT 
        t.id,
        t.name,
        COALESCE(lt.is_active, FALSE) as is_active,
        lt.last_location_update as last_location_time,
        lt.driver_id as driver_name,
        lt.status_message as stop_message,
        lt.created_at as live_trek_created
      FROM treks t
      LEFT JOIN (
        SELECT 
          trek_id,
          is_active,
          last_location_update,
          driver_id,
          status_message,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY trek_id ORDER BY created_at DESC) as rn
        FROM live_treks
      ) lt ON t.id = lt.trek_id AND lt.rn = 1
      ORDER BY COALESCE(lt.is_active, FALSE) DESC, t.name ASC
    `);
    
    // Convert is_active from integer to boolean for frontend compatibility
    const formattedTreks = treks.map(trek => ({
      ...trek,
      is_active: Boolean(trek.is_active)
    }));
    
    res.json(formattedTreks);
  } catch (error) {
    console.error('Error fetching driver treks:', error);
    res.status(500).json({ error: 'Failed to fetch treks' });
  }
});

// Get active treks for user panel
router.get('/active-treks', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Get active treks with only essential information (latest live_trek entry per trek)
    const [treks] = await db.query(`
      SELECT 
        t.id,
        t.name,
        lt.is_active,
        lt.last_location_update as last_location_time,
        lt.driver_id as driver_name,
        tl.latitude,
        tl.longitude,
        tl.accuracy
      FROM treks t
      INNER JOIN (
        SELECT 
          trek_id,
          is_active,
          last_location_update,
          driver_id,
          ROW_NUMBER() OVER (PARTITION BY trek_id ORDER BY created_at DESC) as rn
        FROM live_treks
        WHERE is_active = TRUE
      ) lt ON t.id = lt.trek_id AND lt.rn = 1
      LEFT JOIN trek_locations tl ON t.id = tl.trek_id 
        AND tl.timestamp = (
          SELECT MAX(timestamp) 
          FROM trek_locations 
          WHERE trek_id = t.id
        )
      ORDER BY lt.last_location_update DESC
    `);
    
    // Convert is_active from integer to boolean for frontend compatibility
    const formattedTreks = treks.map(trek => ({
      ...trek,
      is_active: Boolean(trek.is_active)
    }));
    
    res.json(formattedTreks);
  } catch (error) {
    console.error('Error fetching active treks:', error);
    res.status(500).json({ error: 'Failed to fetch active treks' });
  }
});

// Submit GPS location for a trek
router.post('/trek-location', async (req, res) => {
  try {
    const { trek_id, latitude, longitude, accuracy, altitude, speed, heading } = req.body;
    
    if (!trek_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = req.app.get('db');
    
    // Get or create live_trek entry
    let [liveTreks] = await db.query(
      'SELECT id FROM live_treks WHERE trek_id = ? AND is_active = TRUE',
      [trek_id]
    );
    
    let liveTrekId;
    if (liveTreks.length === 0) {
      // Create new live trek entry
      const [result] = await db.query(
        'INSERT INTO live_treks (trek_id, is_active) VALUES (?, TRUE)',
        [trek_id]
      );
      liveTrekId = result.insertId;
    } else {
      liveTrekId = liveTreks[0].id;
    }
    
    // Insert location data
    await db.query(`
      INSERT INTO trek_locations 
      (trek_id, latitude, longitude, accuracy, altitude, speed, heading)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [trek_id, latitude, longitude, accuracy, altitude, speed, heading]);
    
    // Update last location time in live_treks
    await db.query(
      'UPDATE live_treks SET last_location_update = CURRENT_TIMESTAMP WHERE id = ?',
      [liveTrekId]
    );
    
    res.json({ success: true, live_trek_id: liveTrekId });
  } catch (error) {
    console.error('Error saving trek location:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Get location history for a specific trek
router.get('/trek-locations/:trekId', async (req, res) => {
  try {
    const { trekId } = req.params;
    const db = req.app.get('db');
    
    const [locations] = await db.query(`
      SELECT 
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        timestamp
      FROM trek_locations 
      WHERE trek_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 100
    `, [trekId]);
    
    res.json(locations);
  } catch (error) {
    console.error('Error fetching trek locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get trek details including Google Maps link
router.get('/trek-details/:trekId', async (req, res) => {
  try {
    const { trekId } = req.params;
    const db = req.app.get('db');
    
    const [treks] = await db.query(`
      SELECT 
        t.id,
        t.name,
        lt.google_maps_link,
        lt.is_active,
        lt.last_location_update,
        lt.driver_id,
        lt.status_message
      FROM treks t
      LEFT JOIN live_treks lt ON t.id = lt.trek_id
      WHERE t.id = ?
    `, [trekId]);
    
    if (treks.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }
    
    res.json(treks[0]);
  } catch (error) {
    console.error('Error fetching trek details:', error);
    res.status(500).json({ error: 'Failed to fetch trek details' });
  }
});

// Stop GPS sharing for a trek
router.post('/trek-location/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { stop_message } = req.body;
    const db = req.app.get('db');
    
    await db.query(
      'UPDATE live_treks SET is_active = FALSE, status_message = ? WHERE trek_id = ?',
      [stop_message || 'GPS tracking stopped', id]
    );
    
    res.json({ success: true, message: 'GPS sharing stopped' });
  } catch (error) {
    console.error('Error stopping GPS sharing:', error);
    res.status(500).json({ error: 'Failed to stop GPS sharing' });
  }
});

// Verify driver password
router.post('/verify-driver-password', async (req, res) => {
  try {
    const { password } = req.body;
    const db = req.app.get('db');
    
    const [config] = await db.query(
      'SELECT config_value FROM gps_config WHERE config_key = ?',
      ['driver_password']
    );
    
    if (config.length === 0) {
      return res.status(500).json({ error: 'Driver password not configured' });
    }
    
    const isValid = password === config[0].config_value;
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying driver password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Verify trek-specific password
router.post('/verify-trek-password', async (req, res) => {
  try {
    const { trek_id, password } = req.body;
    const db = req.app.get('db');
    
    const [treks] = await db.query(`
      SELECT lts.tracking_password 
      FROM live_treks lt
      INNER JOIN live_trek_settings lts ON lt.trek_id = lts.trek_id
      WHERE lt.trek_id = ? AND lt.is_active = TRUE
    `, [trek_id]);
    
    if (treks.length === 0) {
      return res.json({ valid: false, error: 'Trek not active' });
    }
    
    const isValid = password === treks[0].tracking_password;
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying trek password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Activate trek with GPS link and password
router.post('/activate-trek', async (req, res) => {
  try {
    const { trek_id, google_maps_link, trek_password, driver_name } = req.body;
    const db = req.app.get('db');
    
    // Check if live trek already exists
    const [existing] = await db.query(
      'SELECT id FROM live_treks WHERE trek_id = ?',
      [trek_id]
    );
    
    if (existing.length > 0) {
      // Update existing live trek
      await db.query(`
        UPDATE live_treks 
        SET google_maps_link = ?, driver_id = ?, is_active = TRUE, active_since = CURRENT_TIMESTAMP, last_location_update = CURRENT_TIMESTAMP
        WHERE trek_id = ?
      `, [google_maps_link, driver_name, trek_id]);
      
      // Update or create trek settings
      await db.query(`
        INSERT INTO live_trek_settings (trek_id, tracking_password, chat_enabled, chat_locked)
        VALUES (?, ?, 1, 0)
        ON DUPLICATE KEY UPDATE 
        tracking_password = VALUES(tracking_password),
        updated_at = CURRENT_TIMESTAMP
      `, [trek_id, trek_password]);
    } else {
      // Create new live trek
      await db.query(`
        INSERT INTO live_treks (trek_id, google_maps_link, driver_id, is_active, active_since, last_location_update)
        VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [trek_id, google_maps_link, driver_name]);
      
      // Create trek settings
      await db.query(`
        INSERT INTO live_trek_settings (trek_id, tracking_password, chat_enabled, chat_locked)
        VALUES (?, ?, 1, 0)
      `, [trek_id, trek_password]);
    }
    
    res.json({ success: true, message: 'Trek activated successfully' });
  } catch (error) {
    console.error('Error activating trek:', error);
    res.status(500).json({ error: 'Failed to activate trek' });
  }
});

// Get GPS configuration
router.get('/config', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [config] = await db.query('SELECT * FROM gps_config');
    
    const configObj = {};
    config.forEach(item => {
      configObj[item.config_key] = item.config_value;
    });
    
    res.json(configObj);
  } catch (error) {
    console.error('Error fetching GPS config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update GPS configuration
router.put('/config', async (req, res) => {
  try {
    const { driver_password } = req.body;
    const db = req.app.get('db');
    
    if (driver_password) {
      await db.query(`
        INSERT INTO gps_config (config_key, config_value, description)
        VALUES ('driver_password', ?, 'Driver panel access password')
        ON DUPLICATE KEY UPDATE 
        config_value = VALUES(config_value),
        updated_at = CURRENT_TIMESTAMP
      `, [driver_password]);
    }
    
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    console.error('Error updating GPS config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

module.exports = router;
