const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const { auth, requireRole } = require('../middleware/auth');
const { User, Contact, Call } = require('../models');

// Apply auth middleware to all routes
router.use(auth);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system-wide statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/stats', requireRole('admin'), async (req, res, next) => {
  try {
    const [userCount, contactCount, callCount] = await Promise.all([
      User.count(),
      Contact.count(),
      Call.count(),
    ]);

    ApiResponse.success(res, {
      users: userCount,
      contacts: contactCount,
      calls: callCount,
    }, 'Statistics retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User list
 *       403:
 *         description: Forbidden
 */
router.get('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      limit,
      offset,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    ApiResponse.paginated(res, rows, {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    }, 'Users retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return ApiResponse.error(res, 'Cannot delete your own account', 400);
    }

    await user.destroy();

    ApiResponse.success(res, null, 'User deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
