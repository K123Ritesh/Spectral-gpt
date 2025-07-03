import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  analysisDate: Date;
  qualityScore: number;
  freshness: string;
  nutritionalValue: string;
  recommendations: string[];
  warnings: string[];
  analysisMetadata: {
    processingTime: number;
    modelVersion: string;
    confidence: number;
  };
  createdAt: Date;
  updatedAt: Date;
  fileUrl: string;
}

const scanSchema = new Schema<IScan>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'], // 10MB limit
  },
  analysisDate: {
    type: Date,
    default: Date.now,
  },
  qualityScore: {
    type: Number,
    required: [true, 'Quality score is required'],
    min: [0, 'Quality score cannot be less than 0'],
    max: [100, 'Quality score cannot be more than 100'],
  },
  freshness: {
    type: String,
    required: [true, 'Freshness assessment is required'],
    enum: ['Excellent', 'Good', 'Fair', 'Poor'],
  },
  nutritionalValue: {
    type: String,
    required: [true, 'Nutritional value assessment is required'],
    enum: ['High', 'Medium', 'Low'],
  },
  recommendations: [{
    type: String,
    trim: true,
  }],
  warnings: [{
    type: String,
    trim: true,
  }],
  analysisMetadata: {
    processingTime: {
      type: Number,
      required: true,
      min: 0,
    },
    modelVersion: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ qualityScore: 1 });
scanSchema.index({ freshness: 1 });
scanSchema.index({ analysisDate: -1 });

// Virtual for file URL
scanSchema.virtual('fileUrl').get(function(this: IScan) {
  return `/uploads/${this.filePath}`;
});

// Ensure virtual fields are serialized
scanSchema.set('toJSON', { virtuals: true });

export default mongoose.model<IScan>('Scan', scanSchema);
