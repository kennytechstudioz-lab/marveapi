import { Request, Response, NextFunction } from 'express';
import Term from '../models/Term';
import ErrorResponse from '../utils/errorResponse';
import asyncHandler from '../middleware/asyncHandler';

// @desc    Get all terms
// @route   GET /api/v1/terms
// @access  Public
export const getTerms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const terms = await Term.find().sort({ createdAt: 1 });
    res.status(200).json({
        success: true,
        data: terms,
    });
});

// @desc    Get a single term by type
// @route   GET /api/v1/terms/:type
// @access  Public
export const getTermByType = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const term = await Term.findOne({ type: req.params.type, isActive: true });
    
    if (!term) {
        return next(new ErrorResponse(`No active term found for type ${req.params.type}`, 404));
    }

    res.status(200).json({
        success: true,
        data: term,
    });
});

// @desc    Update a term
// @route   PUT /api/v1/terms/:id
// @access  Private/Admin-Staff
export const updateTerm = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { title, content, isActive } = req.body;

    const term = await Term.findByIdAndUpdate(
        req.params.id,
        { title, content, isActive },
        { new: true, runValidators: true }
    );

    if (!term) {
        return next(new ErrorResponse('Term not found', 404));
    }

    res.status(200).json({
        success: true,
        data: term,
    });
});
