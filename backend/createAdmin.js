import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import Admin from './models/Admin.js';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';
    const designation = process.argv[5] || '';
    const phoneNumber = process.argv[6] || '';

    if (!email || !password) {
      console.log('\n❌ Usage: node createAdmin.js <email> <password> [name] [designation] [phoneNumber]');
      console.log('Example: node createAdmin.js admin2@bizcard.com MySecretPass "John Doe" "Manager" "+919876543210"\n');
      process.exit(1);
    }

    // Connect to Database
    await connectDB();

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      console.log(`\n❌ Error: Admin already exists with email: ${email}`);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Admin
    const admin = await Admin.create({
      email,
      password: hashedPassword,
      name,
      designation,
      phoneNumber
    });

    console.log('\n✅ Admin created successfully:');
    console.log('---------------------------');
    console.log('Email:      ', admin.email);
    console.log('Password:   ', password);
    console.log('Name:       ', admin.name);
    console.log('Designation:', admin.designation || 'N/A');
    console.log('Phone:      ', admin.phoneNumber || 'N/A');
    console.log('Role:        Regular Admin (Not Super Admin)');
    console.log('---------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
//command
// node createAdmin.js newadmin@example.com yourpassword "Admin Name" "Manager"