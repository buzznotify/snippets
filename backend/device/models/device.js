import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';
const deviceSchema = new mongoose.Schema({
    app_id: {
        type: String,
        required: true
    },

    device_token: {
        type: String,
        required: true
    },
    device_type: {
        type: String,
        required: true,
        enum: ['android', 'ios']
    },
    status: {
        type: String,
        required: true,
        default: 'published'
    },
    name: {
        type: String
    },
    email: {
        type: String
    }
});
timestampMixin(deviceSchema);

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;
