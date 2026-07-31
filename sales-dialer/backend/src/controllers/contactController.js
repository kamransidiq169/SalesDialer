const { validationResult } = require('express-validator');
const { Contact, Call } = require('../models');
const { Op } = require('sequelize');
const csv = require('csv-parser');
const fs = require('fs');

exports.getContacts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        contacts: rows,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createContact = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, phone, email, company, status, notes } = req.body;

    const contact = await Contact.create({
      userId: req.user.id,
      name,
      phone,
      email,
      company,
      status,
      notes,
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    const { name, phone, email, company, status, notes } = req.body;

    await contact.update({
      name: name || contact.name,
      phone: phone || contact.phone,
      email: email !== undefined ? email : contact.email,
      company: company !== undefined ? company : contact.company,
      status: status || contact.status,
      notes: notes !== undefined ? notes : contact.notes,
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: 'Contact deleted',
    });
  } catch (error) {
    next(error);
  }
};

exports.importContacts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const results = [];
    const errors = [];
    let imported = 0;
    let skipped = 0;

    const validStatuses = ['new', 'contacted', 'interested', 'not_interested'];

    return new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            for (let i = 0; i < results.length; i++) {
              const row = results[i];

              if (!row.name || !row.phone) {
                errors.push(`Row ${i + 2}: Missing required fields (name or phone)`);
                skipped++;
                continue;
              }

              const status = row.status && validStatuses.includes(row.status.toLowerCase())
                ? row.status.toLowerCase()
                : 'new';

              await Contact.create({
                userId: req.user.id,
                name: row.name,
                phone: row.phone,
                email: row.email || null,
                company: row.company || null,
                status: status,
                notes: row.notes || null,
              });

              imported++;
            }

            fs.unlinkSync(req.file.path);

            res.json({
              success: true,
              data: {
                imported,
                skipped,
                errors: errors.length > 0 ? errors : null,
              },
            });
          } catch (err) {
            fs.unlinkSync(req.file.path);
            reject(err);
          }
        })
        .on('error', (err) => {
          fs.unlinkSync(req.file.path);
          reject(err);
        });
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};
