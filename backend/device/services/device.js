import axios from "axios";
import Device from "../models/device";
import { getOrganization } from "@/backend/organization/services/organization";
import { logNotification } from "./notification";
import { getDeviceGroupsById } from "./deviceGroup";
import devices from "@/pages/api/v1/device/group/devices";
import { getApp } from "@/backend/app/services/app";
export async function registerDevice(
  app_id,
  device_token,
  device_type,
  name,
  email
) {
  const device = await Device.findOne({
    app_id: app_id,
    device_token: device_token,
  });
  let message;
  if (device) {
    message = "Device already registered!";
  } else {
    await createDevice(app_id, device_token, device_type, name, email);
    message = "Device registered successfully!";
  }
  return message;
}

async function createDevice(
  app_id,
  device_token,
  device_type,
  name,
  email
) {
  const device = new Device({
    app_id: app_id,
    device_token: device_token,
    device_type: device_type,
    name: name,
    email: email,
  });
  await device.save();
  return device;
}

async function updateDevice(organization_id, device_token, name, email) {
  const device = await Device.findOneAndUpdate(
    { organization_id: organization_id, device_token: device_token },
    { name: name, email: email },
    { new: true }
  );
  return device;
}

export async function getAllDevices(app_id) {
  const devices = await Device.find({
    app_id: app_id,
    status: "published",
  }).select("-device_token -__v");
  return devices;
}

export async function notifyDevices(
  app_id,
  groupIds,
  deviceIds,
  title,
  body,
  image
) {
  const app = await getApp(app_id);

  const device_tokens_from_device = await getDeviceTokensOfDevices(
    app_id,
    deviceIds
  );
  const device_tokens_from_group = await getDeviceTokensOfDeviceGroups(
    app_id,
    groupIds
  );
  const all_device_tokens = device_tokens_from_device.concat(
    device_tokens_from_group
  );
  await sendNotificationToFCM(
    app.server_key,
    all_device_tokens,
    title,
    body,
    image
  );
  await logNotification(app_id, groupIds, deviceIds, title, body, image);
}

async function sendNotificationToFCM(serverKey, deviceTokens, title, body, image) {
  const fcmUrl = "https://fcm.googleapis.com/fcm/send";

  const message = {
    registration_ids: deviceTokens,
    notification: {
      title: title,
      body: body,
      image: image,
    },
  };

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "key=" + serverKey,
    },
  };

  await axios.post(fcmUrl, message, config);
}

export async function getDevicesById(app_id, deviceIds) {
  const devices = await Device.find({
    app_id: app_id,
    _id: { $in: deviceIds },
    status: "published",
  }).select("-device_token -__v");
  return devices;
}
export async function getDeviceTokensOfDevices(app_id, device_ids) {
  let device_tokens = await Device.find(
    {
      app_id: app_id,
      _id: { $in: device_ids },
    },
    { _id: 0, device_token: 1 }
  ).lean();
  device_tokens = device_tokens.map((device)=>device.device_token)
  return device_tokens;
}

export async function getDeviceTokensOfDeviceGroups(
  app_id,
  device_group_ids
) {
  const groups = await getDeviceGroupsById(app_id, device_group_ids);
  const device_ids = groups.flatMap((group) => group.device_ids);
  const device_tokens = await getDeviceTokensOfDevices(app_id, device_ids)

  return device_tokens;
}
