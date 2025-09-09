# 🚀 Ronins Trekking Website Setup Guide

## Step 1: Create .env File

Create a file named `.env` in the root directory with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1234567890
DB_NAME=ronins_treks

# JWT Configuration
JWT_SECRET=ronins_trekking_jwt_secret_key_2024_secure_random_string

# Admin Configuration
ADMIN_PASSWORD=admin123

# Server Configuration
PORT=3003
NODE_ENV=development

# Security Configuration
CORS_ORIGIN=http://localhost:3003

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=20

# Session Configuration
SESSION_TIMEOUT=600000
```

## Step 2: Database Setup

### Option A: Using MySQL Command Line

1. **Open MySQL Command Line:**
   ```bash
   mysql -u root -p
   ```

2. **Create Database:**
   ```sql
   CREATE DATABASE ronins_treks;
   USE ronins_treks;
   ```

3. **Run the initialization script:**
   ```bash
   mysql -u root -p ronins_treks < db_init.sql
   ```

### Option B: Using MySQL Workbench

1. **Open MySQL Workbench**
2. **Connect to your MySQL server**
3. **Create a new database:**
   ```sql
   CREATE DATABASE ronins_treks;
   ```
4. **Select the database:**
   ```sql
   USE ronins_treks;
   ```
5. **Open and run the `db_init.sql` file**

### Option C: Using phpMyAdmin

1. **Open phpMyAdmin in your browser**
2. **Create a new database named `ronins_treks`**
3. **Import the `db_init.sql` file**

## Step 3: Verify Database Setup

Run this command to verify the database is set up correctly:

```bash
mysql -u root -p -e "USE ronins_treks; SHOW TABLES;"
```

You should see these tables:
- treks
- bookings
- feedback
- business_queries

## Step 4: Test the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser and go to:**
   - Main website: http://localhost:3003
   - Admin panel: http://localhost:3003/admin-login.html

## Step 5: Admin Login

- **URL:** http://localhost:3003/admin-login.html
- **Password:** admin123

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. **Check MySQL is running:**
   ```bash
   # Windows
   net start mysql
   
   # macOS/Linux
   sudo systemctl start mysql
   ```

2. **Verify your MySQL password:**
   - Update the `DB_PASSWORD` in your `.env` file
   - Make sure it matches your MySQL root password

3. **Check database exists:**
   ```sql
   SHOW DATABASES;
   ```

### Port Issues

If port 3003 is already in use:

1. **Find what's using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :3003
   
   # macOS/Linux
   lsof -i :3003
   ```

2. **Kill the process or change the port in .env**

## Security Notes

⚠️ **Important:** The default passwords in this setup are for development only. For production:

1. **Change the admin password** to something secure
2. **Use a strong JWT secret** (32+ characters)
3. **Use environment-specific database credentials**
4. **Enable SSL/HTTPS**

## Next Steps

After successful setup:
1. Test all functionality
2. Add your own trek data
3. Configure for production deployment
4. Set up monitoring and backups

---

**Need Help?** Check the console logs for detailed error messages.
