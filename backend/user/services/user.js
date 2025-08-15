import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { connectToDB } from "@/backend/database/db";
import { env } from "@/lib/env.js";

const SECRET_KEY = env.SECRET_KEY;
export async function createUser(name, email, password) {
  const encodedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name: name,
    email: email,
    password: encodedPassword,
  });
  await user.save();
  console.log(`User created successfully!`);
  return user;
}

export async function updateUser(userId, organization_id, updatedData) {
  const user = await User.findOneAndUpdate(
    { _id: userId, organization_id: organization_id },
    updatedData,
    { new: true }
  );
  if (user) {
    console.log("User updated successfully!");
  } else {
    console.log("User not found");
  }
}

export async function deleteUser(userId, organization_id) {
  const user = await User.findOneAndUpdate(
    { _id: userId, organization_id: organization_id },
    { status: "archived" },
    { new: true }
  );
  if (user) {
    console.log("User deleted");
  } else {
    console.log("User not found");
  }
}

export async function getUser(userId) {
  const user = await User.findById(userId);
  return user;
}

export async function getUserByEmailId(email) {
  const user = await User.findOne({ email: email });
  console.log(user);
  return user;
}

export async function signUp(name, email, password) {
  console.log(name, email, password);
  let user;
  user = await getUserByEmailId(email);
  if (user) {
    return false;
  }
  user = await createUser(name, email, password);
  return true;
}

export async function logIn(email, password) {
  let token;

  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return token;
  }
  token = jwt.sign(
    { id: user._id },
    SECRET_KEY,
    {
      expiresIn: "24h",
    }
  );
  return token;
}

async function verifyToken(token) {
  const decoded = jwt.verify(token, SECRET_KEY);

  const userId = decoded.id;
  return { userId };
}

export const authRequired = (handler) => async (request, response) => {
  try {
    await connectToDB();
    const token = request.headers.authorization;

    if (!token) {
      return response.status(401).json({ message: "Unauthorized" });
    }

    const { userId } = await verifyToken(token);
    request.userId = userId;

    return await handler(request, response);
  } catch (error) {
    console.error(error);
    return response.status(500).send("Failed to verify token");
  }
};
