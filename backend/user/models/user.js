import mongoose from "mongoose";
import timestampMixin from "../../database/mixins/timestamp.js";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'published'
    }

})
timestampMixin(userSchema);

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User