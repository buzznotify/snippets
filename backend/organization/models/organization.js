import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';
const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'published'
  },
  default_user: {
    type:String,
    require:true,
  },
  server_key: {
    type: String,
  }
});
timestampMixin(organizationSchema);

const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

export default Organization;
