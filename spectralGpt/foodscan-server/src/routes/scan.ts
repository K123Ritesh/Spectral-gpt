import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import Scan from '../models/Scan';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `scan-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Dummy AI analysis function
const performFoodAnalysis = async (filePath: string, fileType: string) => {
  // Simulate processing time
  const processingStart = Date.now();
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // 1-3 seconds
  const processingTime = Date.now() - processingStart;

  // Generate dummy analysis results
  const qualityScore = Math.floor(Math.random() * 40) + 60; // 60-100
  const freshness = ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)];
  const nutritionalValue = ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)];
  
  const recommendations = [
    'Store in refrigerator to maintain freshness',
    'Consume within 2-3 days for best quality',
    'Rich in vitamins and minerals',
    'Good source of dietary fiber',
    'Low in saturated fats',
  ].sort(() => 0.5 - Math.random()).slice(0, 3);

  const warnings = Math.random() > 0.7 ? [
    'Check for signs of spoilage before consumption',
    'May contain allergens - check ingredients',
  ].slice(0, Math.floor(Math.random() * 2) + 1) : [];

  return {
    qualityScore,
    freshness,
    nutritionalValue,
    recommendations,
    warnings,
    analysisMetadata: {
      processingTime,
      modelVersion: '1.0.0',
      confidence: 0.7 + Math.random() * 0.3, // 0.7-1.0
    },
  };
};

// Upload and analyze food image/file
router.post('/analyze', authenticateToken, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Perform AI analysis (dummy implementation)
    const analysisResult = await performFoodAnalysis(req.file.path, req.file.mimetype);

    // Save scan result to database
    const scan = new Scan({
      userId: req.user._id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: req.file.filename,
      fileSize: req.file.size,
      ...analysisResult,
    });

    await scan.save();

    res.json({
      success: true,
      message: 'File analyzed successfully',
      data: {
        id: scan._id,
        fileName: scan.fileName,
        fileType: scan.fileType,
        fileUrl: scan.fileUrl,
        analysisDate: scan.analysisDate,
        qualityScore: scan.qualityScore,
        freshness: scan.freshness,
        nutritionalValue: scan.nutritionalValue,
        recommendations: scan.recommendations,
        warnings: scan.warnings,
        analysisMetadata: scan.analysisMetadata,
      },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    
    // Clean up uploaded file if analysis fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during analysis',
    });
  }
});

// Get user's scan history
router.get('/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get filters from query params
    const filters: any = { userId: req.user._id };
    
    if (req.query.freshness) {
      filters.freshness = req.query.freshness;
    }
    
    if (req.query.minScore) {
      filters.qualityScore = { $gte: parseInt(req.query.minScore as string) };
    }
    
    if (req.query.maxScore) {
      filters.qualityScore = { 
        ...filters.qualityScore, 
        $lte: parseInt(req.query.maxScore as string) 
      };
    }

    const scans = await Scan.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-filePath'); // Don't expose internal file path

    const total = await Scan.countDocuments(filters);

    res.json({
      success: true,
      data: {
        scans,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching history',
    });
  }
});

// Get specific scan by ID
router.get('/:scanId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const scan = await Scan.findOne({
      _id: req.params.scanId,
      userId: req.user._id,
    }).select('-filePath');

    if (!scan) {
      res.status(404).json({
        success: false,
        message: 'Scan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: scan,
    });
  } catch (error: any) {
    console.error('Scan fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching scan',
    });
  }
});

// Delete scan
router.delete('/:scanId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const scan = await Scan.findOne({
      _id: req.params.scanId,
      userId: req.user._id,
    });

    if (!scan) {
      res.status(404).json({
        success: false,
        message: 'Scan not found',
      });
      return;
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, scan.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete scan from database
    await Scan.findByIdAndDelete(scan._id);

    res.json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error: any) {
    console.error('Scan deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting scan',
    });
  }
});

export default router;
