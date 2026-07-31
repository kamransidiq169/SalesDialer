const { Call, Contact, CallNote } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitizePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const AIService = require('./ai.service');

/**
 * Calls service - handles business logic for call management
 */
class CallsService {
  /**
   * Start a new call
   * @param {string} userId - User UUID
   * @param {string} contactId - Contact UUID
   * @returns {Promise<Call>}
   */
  static async startCall(userId, contactId) {
    // Verify contact exists and belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    // Create new call
    const call = await Call.create({
      contactId,
      userId,
      startTime: new Date(),
      status: 'calling',
    });

    // Update contact's last contacted timestamp
    contact.lastContactedAt = new Date();
    await contact.save({ fields: ['lastContactedAt'] });

    // Include contact data in response
    return Call.findByPk(call.id, {
      include: [{ model: Contact, as: 'contact' }],
    });
  }

  /**
   * End an ongoing call
   * @param {string} callId - Call UUID
   * @param {string} userId - User UUID (for ownership check)
   * @returns {Promise<Call>}
   */
  static async endCall(callId, userId) {
    const call = await Call.findOne({
      where: { id: callId, userId },
    });

    if (!call) {
      throw ApiError.notFound('Call not found');
    }

    if (call.status === 'ended') {
      throw ApiError.badRequest('Call has already ended');
    }

    const endTime = new Date();
    const startTime = new Date(call.startTime);
    const duration = Math.floor((endTime - startTime) / 1000);

    await call.update({
      endTime,
      duration,
      status: 'ended',
    });

    return call;
  }

  /**
   * List calls with pagination and filtering
   * @param {string} userId - User UUID
   * @param {Object} params - Query parameters
   * @returns {Promise<{rows: Array, count: number, pagination: Object}>}
   */
  static async listCalls(userId, params = {}) {
    const { page, limit } = sanitizePaginationParams(params, { page: 1, limit: 10 });

    const where = { userId };

    // Filter by contact if provided
    if (params.contactId) {
      where.contactId = params.contactId;
    }

    // Determine sort
    const orderField = params.sortBy || 'startTime';
    const orderDirection = params.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[orderField, orderDirection]];

    const { rows, count } = await Call.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'company', 'phone', 'email'],
        },
        {
          model: CallNote,
          as: 'notes',
          attributes: ['id', 'content', 'aiSummary', 'sentiment', 'createdAt'],
        },
      ],
      order,
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    return {
      rows,
      count,
      pagination: buildPaginationMeta(count, page, limit),
    };
  }

  /**
   * Add a note to a call
   * @param {string} callId - Call UUID
   * @param {string} userId - User UUID (for ownership check)
   * @param {Object} noteData - Note data
   * @returns {Promise<CallNote>}
   */
  static async addNote(callId, userId, noteData) {
    // Verify call exists and belongs to user
    const call = await Call.findOne({
      where: { id: callId, userId },
    });

    if (!call) {
      throw ApiError.notFound('Call not found');
    }

    // Generate AI summary
    const aiSummary = AIService.generateSummary(noteData.content);
    const sentiment = AIService.analyzeSentiment(noteData.content);

    // Create note
    const note = await CallNote.create({
      callId,
      userId,
      content: noteData.content,
      aiSummary,
      sentiment,
    });

    // Update contact status if provided
    if (noteData.contactStatus) {
      await Contact.update(
        { status: noteData.contactStatus },
        { where: { id: call.contactId } }
      );
    }

    return note;
  }

  /**
   * Get notes for a call
   * @param {string} callId - Call UUID
   * @param {string} userId - User UUID (for ownership check)
   * @returns {Promise<Array<CallNote>>}
   */
  static async getNotes(callId, userId) {
    // Verify call exists and belongs to user
    const call = await Call.findOne({
      where: { id: callId, userId },
    });

    if (!call) {
      throw ApiError.notFound('Call not found');
    }

    return CallNote.findAll({
      where: { callId },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get call statistics for a user
   * @param {string} userId - User UUID
   * @param {Object} dateRange - Date range for stats
   * @returns {Promise<Object>}
   */
  static async getStats(userId, dateRange = {}) {
    const where = { userId };

    if (dateRange.startDate) {
      where.startTime = { ...where.startTime, [Op.gte]: new Date(dateRange.startDate) };
    }
    if (dateRange.endDate) {
      where.startTime = { ...where.startTime, [Op.lte]: new Date(dateRange.endDate) };
    }

    const [totalCalls, connectedCalls, missedCalls, totalDuration] = await Promise.all([
      Call.count({ where }),
      Call.count({ where: { ...where, status: 'ended' } }),
      Call.count({ where: { ...where, status: 'missed' } }),
      Call.sum('duration', { where: { ...where, status: 'ended' } }),
    ]);

    return {
      totalCalls,
      connectedCalls,
      missedCalls,
      averageDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    };
  }
}

module.exports = CallsService;
