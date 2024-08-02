import { authRequired } from "@/backend/user/services/user";
import { getAlllogNotification } from "@/backend/device/services/notification";
export default authRequired(async function handler(request, response) {
    if (request.method === "GET") {
        try {
            const notifications = await getAlllogNotification(request.appId);
            return response.status(200).json({ "notifications":  notifications});
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to get notifications" });
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});
