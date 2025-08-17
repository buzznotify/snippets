// import { authRequired } from "@/backend/user/services/user-cached";
// import { createSnippet, updateSnippet, deleteSnippet, getSnippet } from "@/backend/snippet/services/snippet-cached";
import { authRequired } from "@/backend/user/services/user";
import { createSnippet, updateSnippet, deleteSnippet, getSnippet } from "@/backend/snippet/services/snippet";
const SnippetType = {
    TEXT: 'text',
    URL: 'url'
};
export default authRequired(async function handler(request, response) {
    if (request.method === "POST") {
        try {
            const body = await request.body;
            const user_id = request.userId

            const { keyName, value, type } = body;
            if (!Object.values(SnippetType).includes(type)) {
                return response.status(400).json({ message: "Invalid snippet type" });
            }
            const snippet = await createSnippet(user_id, keyName, value, type);

            return response.status(200).json({ data: snippet });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to create snippet");
        }
    } else if (request.method === "PATCH") {
        try {
            const body = await request.body;
            const user_id = request.userId
            const { snippet_id, keyName, value, type } = body;

            // Validate type if provided
            if (type && !Object.values(SnippetType).includes(type)) {
                return response.status(400).json({ message: "Invalid snippet type" });
            }

            const snippet = await updateSnippet(snippet_id, user_id, keyName, value, type);

            return response.status(200).json({ data: snippet });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to update snippet");
        }
    } else if (request.method === "DELETE") {
        try {
            const body = await request.body;
            const user_id = request.userId
            const { snippet_id } = body;
            const message = await deleteSnippet(snippet_id, user_id);

            return response.status(200).json({ message: message });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to delete snippet");
        }
    } else if (request.method === "GET") {
        try {
            const snippet_id = request.query.snippet_id;
            const user_id = request.userId;

            if (!snippet_id) {
                return response.status(400).json({
                    success: false,
                    message: "snippet_id is required"
                });
            }

            const data = await getSnippet(snippet_id, user_id);

            if (!data) {
                return response.status(404).json({
                    success: false,
                    message: "Snippet not found"
                });
            }

            return response.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error("Error fetching snippet:", error);
            return response.status(500).json({
                success: false,
                message: "Failed to fetch snippet"
            });
        }
    }
});


