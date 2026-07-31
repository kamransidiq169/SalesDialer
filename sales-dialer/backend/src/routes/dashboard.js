const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/ApiResponse');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalContacts:
 *                       type: integer
 *                     callsToday:
 *                       type: integer
 *                     interestedLeads:
 *                       type: integer
 *                     notInterestedLeads:
 *                       type: integer
 *                     recentCalls:
 *                       type: array
 *                     statusBreakdown:
 *                       type: object
 *                     callActivity:
 *                       type: array
 *                     conversionRate:
 *                       type: number
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await DashboardService.getStats(req.user.id);
    ApiResponse.success(res, stats, 'Dashboard stats retrieved');
  } catch (error) {
    next(error);
  }
});

module.exports = router;