import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ImageReference {
  resolution: string;
  path: string;
  md5: string;
}

interface TaskModel extends mongoose.Model<ITask> {
  generateRandomPrice(): number;
}

const imageReferenceSchema = new Schema<ImageReference>({
  resolution: {
    type: String,
    required: true,
    enum: ['1024', '800']
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  md5: {
    type: String,
    required: true,
    trim: true
  }
});

export interface ITask extends Document {
  status: 'pending' | 'completed' | 'failed';
  price: number;
  originalPath: string;
  createdAt: Date;
  updatedAt: Date;
  images?: ImageReference[];
  error?: string;
}

const taskSchema = new Schema<ITask>({
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 5,
    max: 50,
    index: true
  },
  originalPath: {
    type: String,
    required: true,
    trim: true
  },
  images: [imageReferenceSchema],
  error: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'tasks'
});

taskSchema.index({ status: 1, price: 1 });
taskSchema.index({ status: 1, createdAt: -1 });

taskSchema.statics.generateRandomPrice = function(): number {
    return parseFloat((Math.random() * (50 - 5) + 5).toFixed(2));
};

export const Task = mongoose.model<ITask, TaskModel>('Task', taskSchema);
