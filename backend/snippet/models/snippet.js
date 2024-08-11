import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';

const snippetSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    keyName: {
        type: String,
        required: true
    },
    value: {
        type: String
    },
    status: {
        type: String,
        required: true,
        default: 'published'
    },
});
timestampMixin(snippetSchema);

const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', snippetSchema);

export { Snippet };