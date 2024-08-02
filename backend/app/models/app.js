import mongoose from 'mongoose';
import timestampMixin from '@/backend/mixins/timestamp';

const appSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  server_key: {
    type: String
  },
  status: {
    type: String,
    required: true,
    default: 'published'
  },
});
timestampMixin(appSchema);

const App = mongoose.models.App || mongoose.model('App', appSchema);

export { App };

const appUserSchema = new mongoose.Schema({
  app_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },

  status: {
    type: String,
    required: true,
    default: 'published'
  },
});
timestampMixin(appUserSchema);

const AppUser = mongoose.models.AppUser || mongoose.model('AppUser', appUserSchema);
export { AppUser };
