const express = require('express')
const router = express.Router()
const riderController = require('../controllers/riderController')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

router.put('/:riderId/online-status', riderController.updateRiderStatus)
router.post('/:riderId/heartbeat', riderController.heartbeatRiderStatus)
router.get('/:riderId/stats', riderController.getRiderStats)
router.get('/:riderId/earnings', riderController.getRiderEarnings)
router.get('/:riderId/orders', riderController.getRiderOrders)
router.get('/orders/available', riderController.getAvailableOrders)
router.get('/preferences', riderController.getRiderPreferences)
router.post('/preferences', riderController.updateRiderPreferences)

// 个人信息管理
router.put('/:riderId/avatar', riderController.updateAvatar)
router.get('/:riderId/profile', riderController.getRiderProfile)
router.put('/:riderId/profile', riderController.updateRiderProfile)
router.post('/:riderId/cert', upload.single('image'), riderController.uploadCert)
router.post('/:riderId/change-phone', riderController.changePhone)
router.post('/:riderId/change-password', riderController.changePassword)
router.get('/:riderId/rank', riderController.getRiderRank)
router.get('/rank-list', riderController.getRankList)
router.get('/:riderId/rating', riderController.getRiderRating)
router.get('/:riderId/reviews', riderController.getRiderReviews)

module.exports = router
