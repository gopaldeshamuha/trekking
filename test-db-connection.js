const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Display connection details
  console.log('Connection Details:');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`User: ${process.env.DB_USER || 'root'}`);
  console.log(`Database: ${process.env.DB_NAME || 'ronins_treks'}`);
  console.log(`Port: ${process.env.DB_PORT || '3306'}\n`);

  try {
    // Create connection pool
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '1234567890',
      database: process.env.DB_NAME || 'ronins_treks',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Basic query test passed');
    
    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables in database`);
    
    if (tables.length > 0) {
      console.log('Tables found:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
    }
    
    // Check treks table specifically
    try {
      const [trekCount] = await connection.execute('SELECT COUNT(*) as count FROM treks');
      console.log(`✅ Treks table accessible with ${trekCount[0].count} records`);
    } catch (err) {
      console.log('⚠️  Treks table not found or accessible');
    }
    
    connection.release();
    await pool.end();
    
    console.log('\n🎉 Database connection test completed successfully!');
    console.log('You can now run your server with: npm start');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Check if database "ronins_treks" exists');
    console.log('4. Ensure MySQL user has proper permissions');
    console.log('5. Run the db_init.sql script to create tables');
  }
}

// Run the test
testDatabaseConnection();
