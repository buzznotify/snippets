import { authRequired } from "@/backend/user/services/user";
import { getSnippetByKeyName } from "@/backend/snippet/services/snippet";

export default authRequired(async function handler(req, res) {
    if (req.method === "GET") {
        try {
            const { keyName } = req.query;
            const user_id = req.userId; // This is set by authRequired middleware

            if (!keyName) {
                return res.status(400).json({ error: "keyName is required" });
            }

            const snippet = await getSnippetByKeyName(user_id, keyName);

            if (!snippet) {
                return res.status(404).json({ error: "Snippet not found" });
            }

            return res.status(200).json({
                success: true,
                data: snippet
            });
        } catch (error) {
            console.error("Error fetching snippet by keyName:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
})
