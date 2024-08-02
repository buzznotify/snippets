import { authRequired } from "@/backend/user/services/user";
import { getAllDevices } from "@/backend/device/services/device";
export default authRequired(async function handler(request, response) {
    if (request.method === "GET") {
        try {
            const devices = await getAllDevices(request.appId)
            return response.status(200).json({ devices: devices });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to fetch devices" });
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});
