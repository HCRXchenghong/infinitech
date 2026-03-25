const express = require('express')
const router = express.Router()
const riderController = require('../controllers/riderController')

router.post('/', riderController.createRiderReview)
router.post('/submit', riderController.submitRiderReview)
router.put('/:id', riderController.updateRiderReview)
router.delete('/:id', riderController.deleteRiderReview)

module.exports = router
