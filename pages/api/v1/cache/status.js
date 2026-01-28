import { authRequired } from "@/backend/user/services/user";
import cacheManager from "@/lib/cache/CacheManager";
import cacheInitializer from "@/lib/cache/CacheInitializer";
import backgroundProcessor from "@/lib/cache/BackgroundProcessor";

export default authRequired(async function handler(req, res) {
    if (req.method === "GET") {
        try {
            const status = {
                initializer: cacheInitializer.getStatus(),
                manager: await cacheManager.getStats(),
                backgroundJobs: backgroundProcessor.getStats(),
                timestamp: new Date().toISOString()
            };

            return res.status(200).json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error("Error getting cache status:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get cache status"
            });
        }
    } else {
        return res.status(405).json({
            success: false,
            message: "Method Not Allowed"
        });
    }
});

