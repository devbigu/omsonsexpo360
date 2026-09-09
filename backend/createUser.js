import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

connectDB();

const createUser = async (name, email, password) => {
  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log('User already exists');
      process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name || 'Test User',
      email,
      password: hashedPassword,
      isEmailVerified: true, // Skip verification for manually created users
    });

    console.log('User created:', user);
    process.exit();
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
};

const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!email || !password) {
  console.log('Usage: node createUser.js [name] <email> <password>');
  console.log('Example: node createUser.js "John Doe" user@example.com password123');
  process.exit(1);
}

createUser(name, email, password);
