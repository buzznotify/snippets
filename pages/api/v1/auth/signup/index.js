import { signUp } from "@/backend/user/services/user";
import { connectToDB } from "@/backend/database/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed"
    });
  }

  try {
    await connectToDB();
    const body = req.body;
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const result = await signUp(name, email, password);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: "User created successfully",
        token: result.token,
        user: result.user
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || "User already exists"
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user"
    });
  }
}
