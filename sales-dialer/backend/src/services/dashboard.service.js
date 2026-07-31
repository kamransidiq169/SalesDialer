const { Contact, Call, User } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Dashboard service - handles business logic for dashboard statistics
 */
class DashboardService {
  /**
   * Get comprehensive dashboard statistics
   * @param {string} userId - User UUID
   * @returns {Promise<Object>}
   */
  static async getStats(userId) {
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of 7 days ago for activity chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      totalContacts,
      callsToday,
      interestedLeads,
      notInterestedLeads,
      newLeads,
      contactedLeads,
      recentCalls,
      statusBreakdown,
      callActivityLast7Days,
    ] = await Promise.all([
      // Total contacts count
      Contact.count({ where: { userId } }),

      // Calls made today
      Call.count({
        where: {
          userId,
          startTime: { [Op.gte]: today },
        },
      }),

      // Interested leads
      Contact.count({
        where: { userId, status: 'interested' },
      }),

      // Not interested leads
      Contact.count({
        where: { userId, status: 'not_interested' },
      }),

      // New leads
      Contact.count({
        where: { userId, status: 'new' },
      }),

      // Contacted leads
      Contact.count({
        where: { userId, status: 'contacted' },
      }),

      // Recent 5 calls with contact info
      Call.findAll({
        where: { userId },
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'name', 'company', 'phone'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),

      // Status breakdown with counts
      Contact.findAll({
        where: { userId },
        attributes: ['status', [fn('COUNT', col('status')), 'count']],
        group: ['status'],
        raw: true,
      }),

      // Call activity last 7 days (grouped by date)
      Call.findAll({
        where: {
          userId,
          startTime: { [Op.gte]: sevenDaysAgo },
          status: { [Op.in]: ['ended', 'connected', 'calling'] },
        },
        attributes: [
          [fn('DATE', col('startTime')), 'date'],
          [fn('COUNT', '*'), 'count'],
          [fn('SUM', col('duration')), 'totalDuration'],
        ],
        group: [fn('DATE', col('startTime'))],
        order: [[fn('DATE', col('startTime')), 'ASC']],
        raw: true,
      }),
    ]);

    // Process status breakdown into object
    const statusCounts = {
      new: 0,
      contacted: 0,
      interested: 0,
      not_interested: 0,
    };

    statusBreakdown.forEach((item) => {
      if (item.status in statusCounts) {
        statusCounts[item.status] = parseInt(item.count, 10);
      }
    });

    // Process call activity into chart-ready format
    const callActivity = this.processCallActivity(callActivityLast7Days);

    // Calculate conversion rate
    const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const conversionRate = totalLeads > 0
      ? ((statusCounts.interested / totalLeads) * 100).toFixed(1)
      : 0;

    return {
      // Contact stats
      totalContacts,
      contactBreakdown: {
        new: newLeads,
        contacted: contactedLeads,
        interested: interestedLeads,
        notInterested: notInterestedLeads,
      },
      statusBreakdown: statusCounts,

      // Call stats
      callsToday,
      recentCalls,
      callActivity,

      // Metrics
      conversionRate: parseFloat(conversionRate),

      // Totals
      totalLeads,
    };
  }

  /**
   * Process call activity data into chart-ready format
   * @param {Array} rawData - Raw query results
   * @returns {Array}
   */
  static processCallActivity(rawData) {
    const result = [];
    const today = new Date();

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = rawData.find((d) => d.date === dateStr);
      result.push({
        date: dateStr,
        dateFormatted: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        calls: dayData ? parseInt(dayData.count, 10) : 0,
        duration: dayData ? parseInt(dayData.totalDuration || 0, 10) : 0,
      });
    }

    return result;
  }

  /**
   * Get team-wide statistics (for admin dashboard)
   * @returns {Promise<Object>}
   */
  static async getTeamStats() {
    const [
      totalUsers,
      activeUsers,
      totalContacts,
      totalCalls,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      Contact.count(),
      Call.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalContacts,
      totalCalls,
    };
  }
}

module.exports = DashboardService;
