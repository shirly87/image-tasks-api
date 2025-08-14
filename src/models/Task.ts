import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ImageReference {
  resolution: string;
  path: string;
  md5: string;
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

taskSchema.methods.updateStatus = function(status: 'pending' | 'completed' | 'failed', error?: string): void {
  this.status = status;
  if (error) {
    this.error = error;
  }
  this.updatedAt = new Date();
};

taskSchema.methods.addProcessedImage = function(resolution: string, path: string, md5: string): void {
  if (!this.images) {
    this.images = [];
  }
  
  this.images.push({
    resolution,
    path,
    md5
  });
  
  this.updatedAt = new Date();
};

export const Task = mongoose.model<ITask>('Task', taskSchema);
