import { App, AppUser } from "../models/app";

export async function createApp(name) {
    const app = new App({ name });
    await app.save();
    console.log(`Application "${name}" created successfully!`);
    return app
}

export async function mapAppAndUser(app_id, user_id) {
    const app_user = new AppUser({ app_id, user_id })
    await app_user.save()
    return true
}

export async function getApp(app_id) {
    const app = await App.findById(app_id)
    return app
}

export async function getAppUsersByUserId(user_id) {
    const app_users = await AppUser.find({ user_id })
    return app_users


}

export async function getAppsById(app_ids) {
    const apps = await App.find({ _id: { $in: app_ids }, status:"published" }).select("-server_key -__v")
    return apps
}

export async function createAppAndUserMap(app_name, user_id) {
    const app = await createApp(app_name)
    await mapAppAndUser(app._id, user_id)
    return app._id

}