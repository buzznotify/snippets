import { authRequired } from "@/backend/user/services/user";
import { notifyDevices } from "@/backend/device/services/device";

export default authRequired(async function handler(request, response) {
    if (request.method === "POST") {
        try {
            const { groupIds, deviceIds, title, body, image } = await request.body;
            await notifyDevices(request.appId, groupIds, deviceIds, title, body, image);
            return response.status(200).json({ message: "Notification sent successfully!" });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to send notification" });
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});
