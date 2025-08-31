import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { connectToDB } from "../../database/db.js";
import cacheService from "../../../lib/redis/CacheService.js";
import { env } from "../../../lib/env.js";

const SECRET_KEY = env.SECRET_KEY;

/**
 * Enhanced User Service with Cache-First Architecture
 * Implements Write-Behind pattern: Cache first, then sync to DB in background
 */

/**
 * Create a new user with cache-first approach
 */
export async function createUser(name, email, password) {
    try {
        console.log('Creating user with cache-first approach:', { name, email });

        const encodedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name,
            email: email,
            password: encodedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Save to database first to get the ID
        await user.save();

        // Cache the user data (Write-Behind pattern)
        const userData = user.toObject();
        await cacheService.cacheUser(user._id.toString(), userData);

        // Also cache by email for faster lookups
        const emailCacheKey = `user:email:${email}`;
        await cacheService.redis.executeOperation(async (client) => {
            await client.set(
                emailCacheKey,
                JSON.stringify(userData),
                'EX',
                3600 // 1 hour TTL for email lookups
            );
        });

        console.log(`User created successfully with cache-first approach!`);
        return user;

    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Update user with cache-first approach
 */
export async function updateUser(userId, organization_id, updatedData) {
    try {
        console.log('Updating user with cache-first approach:', { userId, organization_id, updatedData });

        // Update in cache first
        const cacheKey = `user:${userId}`;
        const existingUser = await cacheService.getUser(userId, async () => {
            return await User.findById(userId);
        });

        if (!existingUser) {
            console.log('User not found');
            return null;
        }

        // Update cache with new data
        const updatedUserData = { ...existingUser, ...updatedData, updatedAt: new Date() };
        await cacheService.updateUser(userId, updatedUserData);

        // Update in database
        const user = await User.findOneAndUpdate(
            { _id: userId, organization_id: organization_id },
            updatedData,
            { new: true }
        );

        if (user) {
            console.log("User updated successfully with cache-first approach!");
            return user;
        } else {
            console.log("User not found");
            return null;
        }

    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

/**
 * Delete user with cache-first approach
 */
export async function deleteUser(userId, organization_id) {
    try {
        console.log('Deleting user with cache-first approach:', { userId, organization_id });

        // Delete from cache first
        await cacheService.deleteUser(userId);

        // Update status in database
        const user = await User.findOneAndUpdate(
            { _id: userId, organization_id: organization_id },
            { status: "archived", updatedAt: new Date() },
            { new: true }
        );

        if (user) {
            console.log("User deleted with cache-first approach");
            return user;
        } else {
            console.log("User not found");
            return null;
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

/**
 * Get user by ID with cache-first approach
 */
export async function getUser(userId) {
    try {
        console.log('Getting user with cache-first approach:', { userId });

        try {
            const user = await cacheService.getUser(
                userId,
                async () => {
                    // Cache miss - fetch from database
                    const dbUser = await User.findById(userId);
                    if (dbUser) {
                        // Cache the user for future requests
                        await cacheService.cacheUser(userId, dbUser.toObject());
                    }
                    return dbUser;
                }
            );

            return user;
        } catch (cacheError) {
            console.warn('Cache operation failed, falling back to database:', cacheError.message);

            // Direct database fallback when cache fails
            const dbUser = await User.findById(userId);
            if (dbUser) {
                // Try to cache for future requests (but don't fail if it doesn't work)
                try {
                    await cacheService.cacheUser(userId, dbUser.toObject());
                } catch (cacheSetError) {
                    console.warn('Failed to cache user after fallback:', cacheSetError.message);
                }
            }
            return dbUser;
        }

    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

/**
 * Get user by email with cache-first approach
 */
export async function getUserByEmailId(email) {
    try {
        console.log('Getting user by email with cache-first approach:', { email });

        // Try cache first using email
        const emailCacheKey = `user:email:${email}`;
        const cachedUser = await cacheService.redis.executeOperation(async (client) => {
            return await client.get(emailCacheKey);
        });

        if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            console.log('User found in cache');
            return userData;
        }

        // Cache miss - fetch from database
        const dbUser = await User.findOne({ email: email });

        if (dbUser) {
            // Cache the user by ID
            await cacheService.cacheUser(dbUser._id.toString(), dbUser.toObject());

            // Also cache by email for faster lookups
            await cacheService.redis.executeOperation(async (client) => {
                await client.set(
                    emailCacheKey,
                    JSON.stringify(dbUser.toObject()),
                    'EX',
                    3600 // 1 hour TTL for email lookups
                );
            });
        }

        console.log('User found in database');
        return dbUser;

    } catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
}

/**
 * User signup with cache-first approach
 */
export async function signUp(name, email, password) {
    try {
        console.log('User signup with cache-first approach:', { name, email });

        // Check if user already exists in cache first
        const existingUser = await getUserByEmailId(email);
        if (existingUser) {
            return false;
        }

        // Create new user
        const user = await createUser(name, email, password);
        return true;

    } catch (error) {
        console.error('Error in signup:', error);
        throw error;
    }
}

/**
 * User login with cache-first approach
 */
export async function logIn(email, password) {
    try {
        console.log('User login with cache-first approach:', { email });

        // Get user from cache first
        const user = await getUserByEmailId(email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return null;
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        // Cache the session
        const sessionData = {
            userId: user._id,
            email: user.email,
            name: user.name,
            loginTime: new Date().toISOString(),
            token: token
        };

        await cacheService.cacheSession(token, sessionData);

        return token;

    } catch (error) {
        console.error('Error in login:', error);
        throw error;
    }
}

/**
 * Verify JWT token with cache-first approach
 */
async function verifyToken(token) {
    try {
        // Try to get session from cache first
        try {
            const session = await cacheService.getSession(token);
            if (session) {
                return { userId: session.userId };
            }
        } catch (cacheError) {
            console.warn('Cache session lookup failed, proceeding with JWT verification:', cacheError.message);
        }

        // Cache miss or cache failed - verify token manually
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.id;

        // Try to cache the session for future requests
        try {
            const user = await getUser(userId);
            if (user) {
                const sessionData = {
                    userId: user._id,
                    email: user.email,
                    name: user.name,
                    loginTime: new Date().toISOString(),
                    token: token
                };
                await cacheService.cacheSession(token, sessionData);
            }
        } catch (cacheError) {
            console.warn('Failed to cache session after JWT verification:', cacheError.message);
            // Don't fail authentication if caching fails
        }

        return { userId };

    } catch (error) {
        console.error('Error verifying token:', error);
        throw error;
    }
}

/**
 * Authentication middleware with cache-first approach
 */
export const authRequired = (handler) => async (request, response) => {
    try {
        await connectToDB();
        const token = request.headers.authorization;

        if (!token) {
            return response.status(401).json({ message: "Unauthorized" });
        }

        const { userId } = await verifyToken(token);
        request.userId = userId;

        return handler(request, response);

    } catch (error) {
        console.error('Authentication error:', error);
        return response.status(401).json({ message: "Unauthorized" });
    }
};

/**
 * Bulk sync existing database users to cache
 * This ensures all existing data is available in cache
 */
export const syncExistingUsersToCache = async () => {
    try {
        console.log(' Starting bulk sync of existing users to cache...');

        // Get all active users from database
        const allUsers = await User.find({ status: { $ne: "archived" } });
        console.log(`Found ${allUsers.length} users to sync to cache`);

        if (allUsers.length === 0) {
            console.log('No users to sync');
            return { success: true, syncedCount: 0 };
        }

        let totalSynced = 0;

        // Sync each user
        for (const user of allUsers) {
            try {
                // Cache user by ID
                await cacheService.cacheUser(user._id.toString(), user.toObject());

                // Cache user by email
                const emailCacheKey = `user:email:${user.email}`;
                await cacheService.redis.executeOperation(async (client) => {
                    await client.set(
                        emailCacheKey,
                        JSON.stringify(user.toObject()),
                        'EX',
                        3600
                    );
                });

                totalSynced++;
                console.log(` Synced user: ${user.email}`);

            } catch (error) {
                console.error(` Failed to sync user ${user.email}:`, error);
            }
        }

        console.log(` Bulk sync completed! Total users synced: ${totalSynced}`);
        return { success: true, syncedCount: totalSynced };

    } catch (error) {
        console.error(' Bulk sync failed:', error);
        throw error;
    }
};

/**
 * Get cache statistics for users
 */
export const getUserCacheStats = async () => {
    try {
        const stats = await cacheService.getStats();
        return await cacheService.redis.executeOperation(async (client) => {
            return {
                cacheStatus: cacheService.getStatus(),
                userCount: await client.keys('user:*').then(keys => keys.length),
                sessionCount: await client.keys('session:*').then(keys => keys.length),
                ...stats
            };
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return null;
    }
};
