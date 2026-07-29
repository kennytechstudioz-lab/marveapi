import { Response, NextFunction } from 'express';
import Notification from '../models/Notification';

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments({ recipient: userId });
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            data: notifications,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const count = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.status(200).json({
            success: true,
            count,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification(s) as read
// @route   PUT /api/v1/notifications/mark-read
// @access  Private
export const markAsRead = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const { notificationId } = req.body;

        if (notificationId) {
            await Notification.updateOne({ _id: notificationId, recipient: userId }, { isRead: true });
        } else {
            // Mark all as read
            await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
        }

        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.status(200).json({
            success: true,
            message: 'Notifications marked as read',
            unreadCount,
        });
    } catch (error) {
        next(error);
    }
};
