const express = require('express');
const router = express.Router();
const ClubController = require('../controllers/clubController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/', ClubController.createClub);
router.get('/', ClubController.getAllClubs);
router.get('/my-clubs', ClubController.getUserClubs);
router.get('/:clubId', ClubController.getClub);
router.post('/:clubId/join', ClubController.joinClub);
router.post('/:clubId/leave', ClubController.leaveClub);
router.get('/:clubId/members', ClubController.getClubMembers);

module.exports = router;
