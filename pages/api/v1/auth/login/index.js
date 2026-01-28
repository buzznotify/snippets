import { logIn } from "@/backend/user/services/user";
import { connectToDB } from "@/backend/database/db";

export default async function handler(request, response) {
  if (request.method === "POST") {
    try {
      await connectToDB();
      const body = request.body;
      const { email, password } = body;

      if (!email || !password) {
        return response.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      const result = await logIn(email, password);

      if (result.success) {
        return response.status(200).json({
          success: true,
          token: result.token,
          user: result.user
        });
      } else {
        return response.status(401).json({
          success: false,
          message: result.message || "Invalid credentials"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      return response.status(500).json({
        success: false,
        message: "Failed to login"
      });
    }
  } else {
    return response.status(405).json({
      success: false,
      message: "Method Not Allowed"
    });
  }
}
