import { registerDevice } from "@/backend/device/services/device";
import { connectToDB } from "@/backend/database/db";


export default async function handler(request, response) {
  if (request.method === "POST") {
    try {
      await connectToDB();
      const body = await request.body;
      const appId = request.headers.app_id

      const { device_token, device_type, name, email } = body;
      const message = await registerDevice(
        appId,
        device_token,
        device_type,
        name || "",
        email || ""
      );

      return response.status(200).json({ message: message });
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to register device");
    }
  } else {
    return response.status(405).send("Method Not Allowed");
  }
};