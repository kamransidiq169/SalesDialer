const { validationResult } = require('express-validator');
const { Call, Contact, CallNote } = require('../models');

const generateAISummary = (content) => {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('interested') || lowerContent.includes('yes')) {
    return 'Customer expressed strong interest. Recommended following up within 48 hours.';
  }

  if (lowerContent.includes('not interested') || lowerContent.includes('not_interested') || lowerContent.includes('no')) {
    return 'Customer declined. Mark as not interested and remove from active pipeline.';
  }

  if (lowerContent.includes('callback') || lowerContent.includes('follow') || lowerContent.includes('call back')) {
    return 'Customer requested callback. Schedule follow-up for next week.';
  }

  return 'Call completed. Review notes for next steps.';
};

exports.startCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { contactId } = req.body;

    const contact = await Contact.findOne({
      where: {
        id: contactId,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    const call = await Call.create({
      contactId,
      userId: req.user.id,
      startTime: new Date(),
      status: 'calling',
    });

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
};

exports.endCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { callId } = req.body;

    const call = await Call.findOne({
      where: {
        id: callId,
        userId: req.user.id,
      },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    const endTime = new Date();
    const startTime = new Date(call.startTime);
    const duration = Math.round((endTime - startTime) / 1000);

    await call.update({
      endTime,
      duration,
      status: 'ended',
    });

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCalls = async (req, res, next) => {
  try {
    const {
      contactId = '',
      sortBy = 'date',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { userId: req.user.id };

    if (contactId) {
      where.contactId = contactId;
    }

    const orderClause = sortBy === 'duration'
      ? [['duration', order.toUpperCase()]]
      : [['startTime', order.toUpperCase()]];

    const { count, rows } = await Call.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'company', 'phone'],
        },
        {
          model: CallNote,
          as: 'notes',
          attributes: ['id', 'content', 'aiSummary', 'createdAt'],
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        calls: rows,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.addNote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { content } = req.body;

    const call = await Call.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    const aiSummary = generateAISummary(content);

    const note = await CallNote.create({
      callId: req.params.id,
      userId: req.user.id,
      content,
      aiSummary,
    });

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    const call = await Call.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    const notes = await CallNote.findAll({
      where: { callId: req.params.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};
