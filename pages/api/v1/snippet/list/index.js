import { authRequired } from "@/backend/user/services/user-cached";
import { getAllSnippets } from "@/backend/snippet/services/snippet-cached";
export default authRequired(async function handler(request, response) {
    if (request.method === "GET") {
        try {
            const user_id = request.userId
            const data = await getAllSnippets(user_id);

            return response.status(200).json({ data: data });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to get snippets");
        }
    }
});


