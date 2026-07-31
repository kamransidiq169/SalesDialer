const express = require('express');
const router = express.Router();
const CallsService = require('../services/calls.service');
const ApiResponse = require('../utils/ApiResponse');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  startCallValidators,
  endCallValidators,
  noteValidators,
  callQueryValidators,
} = require('../validators/calls.validators');

// Apply auth middleware to all routes
router.use(auth);

/**
 * @swagger
 * /api/calls:
 *   get:
 *     summary: List all calls
 *     tags: [Calls]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: contactId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [startTime, duration, createdAt]
 *     responses:
 *       200:
 *         description: Paginated call list
 */
router.get('/', validate(callQueryValidators), async (req, res, next) => {
  try {
    const { page, limit, contactId, sortBy, order } = req.query;
    const result = await CallsService.listCalls(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      contactId,
      sortBy,
      order,
    });

    ApiResponse.paginated(res, result.rows, result.pagination, 'Calls retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/calls/start:
 *   post:
 *     summary: Start a new call
 *     tags: [Calls]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactId
 *             properties:
 *               contactId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Call started
 *       404:
 *         description: Contact not found
 */
router.post('/start', validate(startCallValidators), async (req, res, next) => {
  try {
    const { contactId } = req.body;
    const call = await CallsService.startCall(req.user.id, contactId);
    ApiResponse.success(res, call, 'Call started', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/calls/end:
 *   post:
 *     summary: End an ongoing call
 *     tags: [Calls]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callId
 *             properties:
 *               callId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Call ended
 *       404:
 *         description: Call not found
 */
router.post('/end', validate(endCallValidators), async (req, res, next) => {
  try {
    const { callId } = req.body;
    const call = await CallsService.endCall(callId, req.user.id);
    ApiResponse.success(res, call, 'Call ended');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/calls/{id}/notes:
 *   post:
 *     summary: Add a note to a call
 *     tags: [Calls]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               contactStatus:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note added
 */
router.post('/:id/notes', validate(noteValidators), async (req, res, next) => {
  try {
    const note = await CallsService.addNote(req.params.id, req.user.id, req.body);
    ApiResponse.success(res, note, 'Note added', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/calls/{id}/notes:
 *   get:
 *     summary: Get notes for a call
 *     tags: [Calls]
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
 *         description: Call notes
 */
router.get('/:id/notes', async (req, res, next) => {
  try {
    const notes = await CallsService.getNotes(req.params.id, req.user.id);
    ApiResponse.success(res, notes, 'Notes retrieved');
  } catch (error) {
    next(error);
  }
});

module.exports = router;