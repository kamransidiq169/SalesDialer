const { Contact, Call } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { sanitizePaginationParams, buildPaginationMeta } = require('../utils/pagination');

/**
 * Contacts service - handles business logic for contact management
 */
class ContactsService {
  /**
   * List contacts with pagination and filtering
   * @param {string} userId - User UUID
   * @param {Object} params - Query parameters
   * @returns {Promise<{rows: Array, count: number, pagination: Object}>}
   */
  static async list(userId, params = {}) {
    const { page, limit } = sanitizePaginationParams(params, { page: 1, limit: 10 });

    const where = { userId };

    // Apply search filter
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchTerm } },
        { email: { [Op.like]: searchTerm } },
        { company: { [Op.like]: searchTerm } },
        { phone: { [Op.like]: searchTerm } },
      ];
    }

    // Apply status filter
    if (params.status) {
      where.status = params.status;
    }

    // Determine sort order
    const orderField = params.sortBy || 'createdAt';
    const orderDirection = params.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[orderField, orderDirection]];

    const { rows, count } = await Contact.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order,
      attributes: {
        exclude: [], // Include all fields
      },
    });

    return {
      rows,
      count,
      pagination: buildPaginationMeta(count, page, limit),
    };
  }

  /**
   * Create a new contact
   * @param {string} userId - User UUID
   * @param {Object} data - Contact data
   * @returns {Promise<Contact>}
   */
  static async create(userId, data) {
    const contact = await Contact.create({
      userId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      company: data.company || null,
      status: data.status || 'new',
      notes: data.notes || null,
    });

    return contact;
  }

  /**
   * Find a single contact by ID
   * @param {string} id - Contact UUID
   * @param {string} userId - User UUID (for ownership check)
   * @returns {Promise<Contact>}
   */
  static async findOne(id, userId) {
    const contact = await Contact.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    return contact;
  }

  /**
   * Update a contact
   * @param {string} id - Contact UUID
   * @param {string} userId - User UUID (for ownership check)
   * @param {Object} data - Update data
   * @returns {Promise<Contact>}
   */
  static async update(id, userId, data) {
    const contact = await Contact.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    // Update only provided fields
    const updateFields = ['name', 'phone', 'email', 'company', 'status', 'notes'];
    updateFields.forEach((field) => {
      if (data[field] !== undefined) {
        contact[field] = data[field];
      }
    });

    await contact.save();
    return contact;
  }

  /**
   * Delete a contact
   * @param {string} id - Contact UUID
   * @param {string} userId - User UUID (for ownership check)
   * @returns {Promise<void>}
   */
  static async delete(id, userId) {
    const contact = await Contact.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw ApiError.notFound('Contact not found');
    }

    // Optionally delete associated calls and notes
    // For now, we just delete the contact (cascade should handle related records if configured)
    await contact.destroy();
  }

  /**
   * Bulk import contacts from array of records
   * @param {string} userId - User UUID
   * @param {Array} records - Array of contact objects
   * @returns {Promise<{imported: number, skipped: number, errors: Array}>}
   */
  static async bulkImport(userId, records) {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    const validStatuses = ['new', 'contacted', 'interested', 'not_interested'];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        // Validate required fields
        if (!row.name || !row.phone) {
          errors.push(`Row ${i + 2}: Missing required fields (name or phone)`);
          skipped++;
          continue;
        }

        // Validate phone format
        const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
        if (!phoneRegex.test(row.phone)) {
          errors.push(`Row ${i + 2}: Invalid phone number format`);
          skipped++;
          continue;
        }

        // Validate email if provided
        if (row.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            errors.push(`Row ${i + 2}: Invalid email format`);
            skipped++;
            continue;
          }
        }

        await Contact.create({
          userId,
          name: row.name.trim(),
          phone: row.phone.trim(),
          email: row.email?.trim() || null,
          company: row.company?.trim() || null,
          status: validStatuses.includes(row.status?.toLowerCase())
            ? row.status.toLowerCase()
            : 'new',
          notes: row.notes?.trim() || null,
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Get contacts that haven't been contacted in X days
   * @param {string} userId - User UUID
   * @param {number} days - Number of days
   * @returns {Promise<Array<Contact>>}
   */
  static async getStaleContacts(userId, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Contact.findAll({
      where: {
        userId,
        status: { [Op.in]: ['new', 'contacted'] },
        [Op.or]: [
          { lastContactedAt: { [Op.is]: null } },
          { lastContactedAt: { [Op.lt]: cutoffDate } },
        ],
      },
      order: [['lastContactedAt', 'ASC NULLS FIRST']],
    });
  }

  /**
   * Get contacts grouped by status
   * @param {string} userId - User UUID
   * @returns {Promise<Object>}
   */
  static async getStatusBreakdown(userId) {
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status'],
    });

    const breakdown = {
      new: 0,
      contacted: 0,
      interested: 0,
      not_interested: 0,
    };

    contacts.forEach((item) => {
      breakdown[item.status] = parseInt(item.get('count'), 10);
    });

    return breakdown;
  }
}

module.exports = ContactsService;
