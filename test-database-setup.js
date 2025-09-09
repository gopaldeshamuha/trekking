#!/usr/bin/env node

/**
 * Database Setup Test Script
 * This script tests the database connection and verifies all tables exist
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDatabaseSetup() {
  console.log('🔍 Testing Database Setup...\n');

  // Check environment variables
  console.log('📋 Checking Environment Variables:');
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  let missingVars = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${varName === 'DB_PASSWORD' ? '***' : process.env[varName]}`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    process.exit(1);
  }

  console.log('\n🔌 Testing Database Connection...');

  let connection;
  try {
    // Test connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Database connection successful!');

    // Test database exists
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [process.env.DB_NAME]);
    if (databases.length === 0) {
      console.log(`❌ Database '${process.env.DB_NAME}' does not exist.`);
      console.log('💡 Run: CREATE DATABASE ronins_treks;');
      process.exit(1);
    }
    console.log(`✅ Database '${process.env.DB_NAME}' exists.`);

    // Check required tables
    console.log('\n📊 Checking Required Tables:');
    const requiredTables = ['treks', 'bookings', 'feedback', 'business_queries'];
    
    for (const tableName of requiredTables) {
      try {
        const [tables] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
        if (tables.length > 0) {
          // Get row count
          const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`✅ ${tableName}: ${rows[0].count} rows`);
        } else {
          console.log(`❌ ${tableName}: Table missing`);
        }
      } catch (error) {
        console.log(`❌ ${tableName}: Error - ${error.message}`);
      }
    }

    // Test sample data
    console.log('\n📝 Checking Sample Data:');
    try {
      const [treks] = await connection.execute('SELECT COUNT(*) as count FROM treks');
      if (treks[0].count > 0) {
        console.log(`✅ Sample treks data: ${treks[0].count} treks loaded`);
      } else {
        console.log('⚠️  No sample treks found. Run db_init.sql to load sample data.');
      }
    } catch (error) {
      console.log(`❌ Error checking sample data: ${error.message}`);
    }

    console.log('\n🎉 Database setup test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Open: http://localhost:3003');
    console.log('3. Admin login: http://localhost:3003/admin-login.html');
    console.log('4. Password: admin123');

  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check your MySQL username and password in .env file');
      console.log('2. Make sure MySQL is running');
      console.log('3. Verify the database exists');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running. Start it with:');
      console.log('Windows: net start mysql');
      console.log('macOS/Linux: sudo systemctl start mysql');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testDatabaseSetup().catch(console.error);
