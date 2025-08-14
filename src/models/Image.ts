import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IImage extends Document {
  taskId: Types.ObjectId;
  resolution: string;
  path: string;
  md5: string;
  createdAt: Date;
}

const imageSchema = new Schema<IImage>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  resolution: {
    type: String,
    required: true,
    enum: ['1024', '800'],
    index: true
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  md5: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'images'
});

imageSchema.index({ taskId: 1, resolution: 1 });
imageSchema.index({ taskId: 1, createdAt: -1 });

imageSchema.statics.findByTaskId = function(taskId: Types.ObjectId) {
  return this.find({ taskId }).sort({ resolution: 1 });
};

imageSchema.statics.findByTaskAndResolution = function(taskId: Types.ObjectId, resolution: string) {
  return this.findOne({ taskId, resolution });
};

imageSchema.methods.getImageInfo = function() {
  return {
    id: this._id,
    resolution: this.resolution,
    path: this.path,
    md5: this.md5,
    createdAt: this.createdAt
  };
};

export const Image = mongoose.model<IImage>('Image', imageSchema);
