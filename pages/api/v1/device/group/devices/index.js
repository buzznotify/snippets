import { authRequired } from "@/backend/user/services/user";
import { getDevicesInDeviceGroups } from "@/backend/device/services/deviceGroup";
export default authRequired(async function handler(request, response) {
    if (request.method === "GET") {
        try {
            const deviceGroupId = request.query.device_group_id
            const {group, devices} = await getDevicesInDeviceGroups(request.appId, deviceGroupId)
            return response.status(200).json({ group:group, devices: devices });
        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: "Failed to fetch devices" });
        }
    } else {
        return response.status(405).send("Method Not Allowed");
    }
});
