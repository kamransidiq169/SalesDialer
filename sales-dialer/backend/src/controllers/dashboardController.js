const { Contact, Call } = require('../models');
const { Op, fn, col } = require('sequelize');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalContacts = await Contact.count({
      where: { userId },
    });

    const callsToday = await Call.count({
      where: {
        userId,
        startTime: {
          [Op.gte]: today,
        },
      },
    });

    const interestedLeads = await Contact.count({
      where: {
        userId,
        status: 'interested',
      },
    });

    const notInterestedLeads = await Contact.count({
      where: {
        userId,
        status: 'not_interested',
      },
    });

    const recentCalls = await Call.findAll({
      where: { userId },
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['name', 'company'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const statusCounts = await Contact.findAll({
      where: { userId },
      attributes: [
        'status',
        [fn('COUNT', col('status')), 'count'],
      ],
      group: ['status'],
    });

    const statusBreakdown = {};
    statusCounts.forEach((item) => {
      statusBreakdown[item.status] = parseInt(item.get('count'));
    });

    res.json({
      success: true,
      data: {
        totalContacts,
        callsToday,
        interestedLeads,
        notInterestedLeads,
        recentCalls,
        statusBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
