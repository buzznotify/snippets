/**
 * User Service - Clean and simple user management
 * 
 * This service handles all user operations with clean separation of concerns.
 * Authentication and session management are kept simple and efficient.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { connectToDB } from "../../database/db.js";
import { env } from "../../../lib/env.js";

const SECRET_KEY = env.SECRET_KEY;
/**
 * Create a new user
 */
export async function createUser(name, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await user.save();
  return user;
}

/**
 * Update user information
 */
export async function updateUser(userId, updatedData) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      ...updatedData,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Delete (archive) a user
 */
export async function deleteUser(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      status: 'archived',
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUser(userId) {
  const user = await User.findById(userId)
    .select('-password') // Exclude password from response
    .lean(); // Return plain object for better performance

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  const user = await User.findOne({
    email,
    status: { $ne: 'archived' }
  });

  return user;
}

/**
 * User signup
 */
export async function signUp(name, email, password) {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { success: false, message: 'User already exists' };
  }

  // Create new user
  const user = await createUser(name, email, password);

  // Generate token for immediate login
  const token = jwt.sign(
    { id: user._id },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    },
    token
  };
}

/**
 * User login
 */
export async function logIn(email, password) {
  const user = await User.findOne({
    email,
    status: { $ne: 'archived' }
  });

  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return { success: false, message: 'Invalid credentials' };
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  };
}

/**
 * Verify JWT token
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return { userId: decoded.id, valid: true };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: false, error: 'Invalid token' };
  }
}

/**
 * Authentication middleware
 */
export const authRequired = (handler) => async (request, response) => {
  try {
    await connectToDB();

    const token = request.headers.authorization;

    if (!token) {
      return response.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const { userId, valid, error } = await verifyToken(token);

    if (!valid) {
      return response.status(401).json({
        success: false,
        message: error || 'Invalid token'
      });
    }

    // Verify user still exists and is active
    const user = await getUser(userId);

    if (!user || user.status === 'archived') {
      return response.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Attach user info to request
    request.userId = userId;
    request.user = user;

    return await handler(request, response);
  } catch (error) {
    console.error('Authentication error:', error);
    return response.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Export getUserByEmailId for backward compatibility
 */
export const getUserByEmailId = getUserByEmail;
