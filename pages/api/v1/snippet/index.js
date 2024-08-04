import { authRequired } from "@/backend/user/services/user";
import { createSnippet, updateSnippet, deleteSnippet, getSnippet } from "@/backend/snippet/services/snippet";
export default authRequired(async function handler(request, response) {
    if (request.method === "POST") {
        try {
            const body = await request.body;
            const user_id = request.userId

            const { keyName, value } = body;
            const message = await createSnippet(user_id, keyName, value);

            return response.status(200).json({ message: message });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to create snippet");
        }
    } else if (request.method === "PATCH") {
        try {
            const body = await request.body;
            const user_id = request.userId
            const { snippet_id, keyName, value } = body;
            const message = await updateSnippet(snippet_id, user_id, keyName, value);

            return response.status(200).json({ message: message });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to update snippet");
        }
    }else if (request.method === "DELETE") {
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
    }else if (request.method === "GET") {
        try {
            const snippet_id = await request.query.snippet_id;
            const user_id = request.userId
            const data = await getSnippet(snippet_id, user_id);

            return response.status(200).json({ data: data });
        } catch (error) {
            console.error(error);
            return response.status(500).send("Failed to delete snippet");
        }
    }
});


