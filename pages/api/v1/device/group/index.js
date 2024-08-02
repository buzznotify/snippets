import {
  getDeviceGroups,
  createDeviceGroup,
  updateDeviceGroup,
  deleteDeviceGroup,
} from "@/backend/device/services/deviceGroup";
import { authRequired } from "@/backend/user/services/user";

export default authRequired(async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const groups = await getDeviceGroups(request.appId);

      return response.status(200).json({ groups: groups });
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to get device groups");
    }
  } else if (request.method === "POST") {
    try {
      const body = await request.body;

      const { name, description, device_ids } = body;
      const group_id = await createDeviceGroup(
        request.appId,
        name,
        description,
        device_ids
      );

      return response
        .status(200)
        .json({ message: "Group created successfully", group_id: group_id });
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to create device group");
    }
  } else if (request.method === "PATCH") {
    try {
      const body = await request.body;

      const { device_group_id, name, description, device_ids } = body;
      const group_id = await updateDeviceGroup(
        request.appId,
        device_group_id,
        name,
        description,
        device_ids
      );

      return response
        .status(200)
        .json({ message: "Group updated successfully", group_id: group_id });
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to update device group");
    }
  } else if (request.method === "DELETE") {
    try {
      const body = await request.body;

      const { device_group_id } = body;
      await deleteDeviceGroup(request.appId, device_group_id);

      return response
        .status(200)
        .json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error(error);
      return response.status(500).send("Failed to delete device group");
    }
  } else {
    return response.status(405).send("Method Not Allowed");
  }
});
