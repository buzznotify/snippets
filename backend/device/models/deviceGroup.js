import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';
const deviceGroupSchema = new mongoose.Schema({
    app_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'published'
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    device_ids: {
        type: Array,
        default: []
    }
});
timestampMixin(deviceGroupSchema);

const DeviceGroup = mongoose.models.DeviceGroup || mongoose.model('DeviceGroup', deviceGroupSchema);

export default DeviceGroup;
