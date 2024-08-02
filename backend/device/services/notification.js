import Notification from "../models/notification";

export async function logNotification(
  app_id,
  group_ids = [],
  device_ids = [],
  title,
  body,
  image
) {
  const notification = Notification({
    app_id: app_id,
    group_ids: group_ids,
    device_ids: device_ids,
    title: title,
    body: body,
    image:image
  });
  await notification.save();
}

export async function getAlllogNotification(app_id) {
  const notifications = await Notification.find({
    app_id: app_id,
  });
  return notifications;
}
