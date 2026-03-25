/**
 * Sync routes
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Get sync state (must be before /:dataset)
router.get('/state', syncController.getSyncState);

// Get sync data
router.get('/:dataset', syncController.getSyncData);

module.exports = router;
