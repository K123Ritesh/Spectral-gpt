import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import User from '../models/User';
import Scan from '../models/Scan';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching profile',
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Name is required',
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map((e: any) => e.message),
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile',
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Get scan statistics
    const totalScans = await Scan.countDocuments({ userId: req.user._id });
    
    const avgScoreResult = await Scan.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, avgScore: { $avg: '$qualityScore' } } },
    ]);
    
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;
    
    // Get latest scan
    const latestScan = await Scan.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('analysisDate');
    
    // Get scans by freshness
    const freshnessCounts = await Scan.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$freshness', count: { $sum: 1 } } },
    ]);
    
    // Get scans by quality score ranges
    const qualityRanges = await Scan.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$qualityScore', 90] }, then: 'excellent' },
                { case: { $gte: ['$qualityScore', 70] }, then: 'good' },
                { case: { $gte: ['$qualityScore', 50] }, then: 'fair' },
              ],
              default: 'poor',
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Get monthly scan counts for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyScans = await Scan.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalScans,
        averageScore,
        lastScanDate: latestScan?.analysisDate || null,
        freshnessCounts: freshnessCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        qualityRanges: qualityRanges.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        monthlyScans: monthlyScans.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching statistics',
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Password is required to delete account',
      });
      return;
    }

    // Verify password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
      return;
    }

    // Delete all user's scans
    await Scan.deleteMany({ userId: req.user._id });

    // Delete user account
    await User.findByIdAndDelete(req.user._id);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting account',
    });
  }
});

export default router;
