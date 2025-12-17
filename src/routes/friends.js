const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Friend requests
router.post('/request', friendController.sendFriendRequest);
router.post('/request/:requestId/accept', friendController.acceptFriendRequest);
router.post('/request/:requestId/reject', friendController.rejectFriendRequest);
router.get('/requests/pending', friendController.getPendingRequests);
router.get('/requests/sent', friendController.getSentRequests);

// Friends
router.get('/', friendController.getFriends);
router.delete('/:friendId', friendController.removeFriend);

// Search
router.get('/search', friendController.searchUsers);

module.exports = router;
