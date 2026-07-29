import { Request, Response, NextFunction } from 'express';
import NotificationTemplate from '../models/NotificationTemplate';
import ErrorResponse from '../utils/errorResponse';
import asyncHandler from '../middleware/asyncHandler';
import { seedNotificationTemplates } from '../utils/templateService';

// @desc    Get all notification templates
// @route   GET /api/v1/templates
// @access  Private/Admin-Staff
export const getNotificationTemplates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await seedNotificationTemplates();
    const templates = await NotificationTemplate.find().sort({ createdAt: 1 });
    res.status(200).json({
        success: true,
        data: templates,
    });
});

// @desc    Update a notification template
// @route   PUT /api/v1/templates/:id
// @access  Private/Admin-Staff
export const updateNotificationTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { titleTemplate, messageTemplate, linkTemplate } = req.body;

    const template = await NotificationTemplate.findByIdAndUpdate(
        req.params.id,
        { titleTemplate, messageTemplate, linkTemplate },
        { new: true, runValidators: true }
    );

    if (!template) {
        return next(new ErrorResponse('Notification template not found', 404));
    }

    res.status(200).json({
        success: true,
        data: template,
    });
});

// @desc    Delete a notification template
// @route   DELETE /api/v1/notification-templates/:id
// @access  Private/Admin-Staff
export const deleteNotificationTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const template = await NotificationTemplate.findById(req.params.id);

    if (!template) {
        return next(new ErrorResponse('Notification template not found', 404));
    }

    await template.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});
