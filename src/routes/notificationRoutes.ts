import express from 'express';
import { getNotifications, getUnreadCount, markAsRead } from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markAsRead);

export default router;
