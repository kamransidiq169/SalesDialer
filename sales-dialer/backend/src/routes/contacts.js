const express = require('express');
const router = express.Router();
const ContactsService = require('../services/contacts.service');
const ApiResponse = require('../utils/ApiResponse');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createContactValidators,
  updateContactValidators,
  queryValidators,
} = require('../validators/contacts.validators');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists before multer writes to it
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
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `contacts-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Apply auth middleware to all routes
router.use(auth);

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: List all contacts
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, interested, not_interested]
 *     responses:
 *       200:
 *         description: Paginated contact list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', validate(queryValidators), async (req, res, next) => {
  try {
    const { page, limit, search, status, sortBy, order } = req.query;
    const result = await ContactsService.list(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      status,
      sortBy,
      order,
    });

    ApiResponse.paginated(res, result.rows, result.pagination, 'Contacts retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Create a new contact
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               company:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [new, contacted, interested, not_interested]
 *     responses:
 *       201:
 *         description: Contact created
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createContactValidators), async (req, res, next) => {
  try {
    const contact = await ContactsService.create(req.user.id, req.body);
    ApiResponse.success(res, contact, 'Contact created', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Get contact by ID
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contact details
 *       404:
 *         description: Contact not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const contact = await ContactsService.findOne(req.params.id, req.user.id);
    ApiResponse.success(res, contact, 'Contact retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Update contact
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               company:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated
 *       404:
 *         description: Contact not found
 */
router.put('/:id', validate(updateContactValidators), async (req, res, next) => {
  try {
    const contact = await ContactsService.update(req.params.id, req.user.id, req.body);
    ApiResponse.success(res, contact, 'Contact updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Delete contact
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contact deleted
 *       404:
 *         description: Contact not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await ContactsService.delete(req.params.id, req.user.id);
    ApiResponse.success(res, null, 'Contact deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contacts/import:
 *   post:
 *     summary: Import contacts from CSV
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import results
 *       400:
 *         description: Invalid file
 */
router.post('/import', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Make sure the form field is named "file".',
      });
    }

    const results = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or has no data rows',
      });
    }

    // Import contacts
    const importResult = await ContactsService.bulkImport(req.user.id, results);

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    ApiResponse.success(res, importResult, 'Import completed');
  } catch (error) {
    // Clean up on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    next(error);
  }
});

module.exports = router;