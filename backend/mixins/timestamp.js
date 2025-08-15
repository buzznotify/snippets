const timestampMixin = (schema) => {
  schema.add({
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  });

  schema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
  });
};

export default timestampMixin