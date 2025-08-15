import { signUp } from "@/backend/user/services/user-cached";
import { connectToDB } from "@/backend/database/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await connectToDB();
    const body = req.body;
    const { name, email, password } = body;
    const is_successful = await signUp(name, email, password);

    if (is_successful) {
      return res.status(200).json({ message: "User created successfully" });
    } else {
      return res.status(400).json({ message: "User already exists" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create user" });
  }
}
