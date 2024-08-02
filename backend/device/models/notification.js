import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';
const notificationSchema = new mongoose.Schema({
    app_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'published'
    },
    title: {
        type: String,
        default: ""
    },
    body: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    group_ids: {
        type: Array,
        default: []
    },
    device_ids: {
        type: Array,
        default: []
    }
});
timestampMixin(notificationSchema);

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
