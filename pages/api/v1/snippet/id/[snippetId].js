import { authRequired } from "@/backend/user/services/user";
import { getSnippet } from "@/backend/snippet/services/snippet";

export default authRequired(async function handler(req, res) {
    if (req.method === "GET") {
        try {
            const { snippetId } = req.query;
            const user_id = req.userId; // This is set by authRequired middleware

            if (!snippetId) {
                return res.status(400).json({
                    success: false,
                    error: "Snippet ID is required"
                });
            }

            const snippet = await getSnippet(snippetId, user_id);

            if (!snippet) {
                return res.status(404).json({
                    success: false,
                    error: "Snippet not found"
                });
            }

            return res.status(200).json({
                success: true,
                data: snippet
            });
        } catch (error) {
            console.error("Error fetching snippet by ID:", error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({
            success: false,
            error: `Method ${req.method} not allowed`
        });
    }
});
