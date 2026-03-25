/**
 * User routes
 */

const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:id/favorites', userController.getUserFavorites);
router.post('/:id/favorites', userController.addUserFavorite);
router.delete('/:id/favorites/:shopId', userController.deleteUserFavorite);
router.get('/:id/favorites/:shopId/status', userController.getUserFavoriteStatus);
router.get('/:id/reviews', userController.getUserReviews);
router.get('/:id/addresses', userController.listUserAddresses);
router.get('/:id/addresses/default', userController.getDefaultUserAddress);
router.post('/:id/addresses', userController.createUserAddress);
router.put('/:id/addresses/:addressId', userController.updateUserAddress);
router.delete('/:id/addresses/:addressId', userController.deleteUserAddress);
router.post('/:id/addresses/:addressId/default', userController.setDefaultUserAddress);

router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.post('/:id/change-phone', userController.changeUserPhone);

module.exports = router;
