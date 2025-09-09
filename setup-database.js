#!/usr/bin/env node

/**
 * Database Setup Script
 * This script creates the database and runs the initialization script
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Setting up Ronins Trekking Database...\n');

  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found!');
    console.log('💡 Please create a .env file with your database credentials.');
    console.log('📋 See SETUP_GUIDE.md for details.');
    process.exit(1);
  }

  let connection;
  try {
    // Connect to MySQL server (without database)
    console.log('🔌 Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    console.log(`📊 Creating database '${process.env.DB_NAME}'...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`✅ Database '${process.env.DB_NAME}' created/verified`);

    // Switch to the database
    await connection.execute(`USE \`${process.env.DB_NAME}\``);

    // Read and execute the initialization script
    const initScriptPath = path.join(__dirname, 'db_init.sql');
    if (!fs.existsSync(initScriptPath)) {
      console.log('❌ db_init.sql file not found!');
      process.exit(1);
    }

    console.log('📝 Running database initialization script...');
    const initScript = fs.readFileSync(initScriptPath, 'utf8');
    
    // Split the script into individual statements
    const statements = initScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          // Ignore "table already exists" errors
          if (!error.message.includes('already exists')) {
            console.log(`⚠️  Warning: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Database initialization completed');

    // Verify tables were created
    console.log('\n📋 Verifying tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const expectedTables = ['treks', 'bookings', 'feedback', 'business_queries'];
    expectedTables.forEach(tableName => {
      if (tableNames.includes(tableName)) {
        console.log(`✅ ${tableName}`);
      } else {
        console.log(`❌ ${tableName} - Missing!`);
      }
    });

    // Check sample data
    const [treks] = await connection.execute('SELECT COUNT(*) as count FROM treks');
    console.log(`\n📊 Sample data: ${treks[0].count} treks loaded`);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: node test-database-setup.js (to verify)');
    console.log('2. Start server: npm start');
    console.log('3. Open: http://localhost:3003');
    console.log('4. Admin: http://localhost:3003/admin-login.html (password: admin123)');

  } catch (error) {
    console.log(`❌ Setup failed: ${error.message}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check your MySQL credentials in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupDatabase().catch(console.error);
