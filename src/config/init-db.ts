import pool from './database';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Debug: Log environment variables
    console.log('Environment variables:');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'undefined');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'undefined');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into parts to handle triggers separately
    const schemaParts = schema.split('-- Create triggers to automatically update updated_at');
    
    // Execute the main schema (tables, indexes, function)
    if (schemaParts[0]) {
      await pool.query(schemaParts[0]);
    }
    
    // Handle triggers separately with error handling
    if (schemaParts[1]) {
      const triggerStatements = schemaParts[1].split(';').filter(stmt => stmt.trim());
      
      for (const statement of triggerStatements) {
        if (statement.trim()) {
          try {
            await pool.query(statement);
          } catch (error: any) {
            // If trigger already exists, log and continue
            if (error.code === '42710') {
              console.log('Trigger already exists, skipping:', statement.trim().split('\n')[0]);
            } else {
              throw error;
            }
          }
        }
      }
    }
    
    console.log('Database initialized successfully!');
    
    // Create a default admin user if it doesn't exist
    const adminCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        ['admin', 'admin@pegatoopensource.com', hashedPassword]
      );
      
      console.log('Default admin user created:');
      console.log('Username: admin');
      console.log('Password: admin123');
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase;
