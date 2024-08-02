import DeviceGroup from "../models/deviceGroup";
import { getDevicesById } from "./device";
export async function createDeviceGroup(
  app_id,
  name,
  description,
  device_ids
) {
  const group = DeviceGroup({
    app_id: app_id,
    name: name,
    description: description,
    device_ids: device_ids,
  });
  await group.save();
  return group._id;
}

export async function updateDeviceGroup(
  app_id,
  device_group_id,
  name,
  description,
  device_ids
) {
  const group = await DeviceGroup.updateOne(
    { _id: device_group_id, app_id: app_id },
    { name: name, description: description, device_ids: device_ids }
  );
  return group._id;
}

export async function getDeviceGroups(app_id) {
  let groups = await DeviceGroup.find(
    { app_id: app_id, status: "published" },
    { _id: 1, name: 1, description: 1, device_ids: 1 }
  ).lean();
  groups = groups.map((group) => ({
    ...group,
    total_devices: group.device_ids.length,
  }));

  return groups;
}

export async function deleteDeviceGroup(app_id, device_group_id) {
  await DeviceGroup.updateOne(
    { _id: device_group_id, app_id: app_id },
    { status: "archived" }
  );
}

export async function getDeviceGroup(app_id, device_group_id) {
  const group = await DeviceGroup.findOne({
    app_id: app_id,
    _id: device_group_id,
  });
  return group;
}
export async function getDevicesInDeviceGroups(
  app_id,
  device_group_id
) {
  const group = await getDeviceGroup(app_id, device_group_id);
  const devices = await getDevicesById(app_id, group.device_ids);
  return {group:group, devices:devices};
}

export async function getDeviceGroupsById(app_id, device_group_ids) {
  const groups = await DeviceGroup.find({
    app_id: app_id,
    _id: { $in: device_group_ids },
  });
  return groups;
}
