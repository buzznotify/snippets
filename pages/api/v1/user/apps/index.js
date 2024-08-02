import { authRequired } from "@/backend/user/services/user";
import { listApps } from "@/backend/user/services/user";
export default authRequired(async function handler(request, response) {
    if (request.method === "GET") {
        try {
            const apps = await listApps(request.userId)
            return response.status(200).json({ apps: apps });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to fetch apps" });
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});
