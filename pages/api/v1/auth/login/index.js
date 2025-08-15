// import { logIn } from "@/backend/user/services/user-cached";
import { logIn } from "@/backend/user/services/user";
import { connectToDB } from "@/backend/database/db";

export default async function handler(request, response) {
  if (request.method === "POST") {
    try {
      await connectToDB();
      const body = await request.body;

      const { email, password } = body;
      const token = await logIn(email, password);

      if (token) {
        return response.status(200).json({ token });
      } else {
        return response.status(400).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to login");
    }
  } else {
    return response.status(405).send("Method Not Allowed");
  }
}
