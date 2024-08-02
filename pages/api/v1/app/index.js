import { authRequired } from "@/backend/user/services/user";
import { createAppAndUserMap } from "@/backend/app/services/app";

export default authRequired(async function handler(request, response) {
    if (request.method === "POST") {
        try {
            const body = await request.body;

            const { name } = body;
            const app_id = await createAppAndUserMap(
                name,
                request.userId
            );

            return response.status(200).json({ app_id: app_id });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to create app");
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});