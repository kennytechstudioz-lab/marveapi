import express from 'express';
import { getNotificationTemplates, updateNotificationTemplate, deleteNotificationTemplate } from '../controllers/notificationTemplateController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'staff'));

router.route('/')
    .get(getNotificationTemplates);

router.route('/:id')
    .put(updateNotificationTemplate)
    .delete(deleteNotificationTemplate);

export default router;
