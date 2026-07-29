import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Notification from '../models/Notification';
import ErrorResponse from '../utils/errorResponse';
import asyncHandler from '../middleware/asyncHandler';
import { uploadToS3, processAndUploadBase64Image } from '../utils/s3';
import { renderNotificationTemplate } from '../utils/templateService';
import paginate from '../utils/paginate';
import {
    emitBusinessVerificationSubmitted,
    emitUnapprovedCountUpdate,
    emitNotificationToUser,
    emitNotificationToAdmins,
} from '../utils/socket';

// @desc    Register user
// @route   POST /api/v1/users
// @access  Public
export const createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let { username, email, password } = req.body;

    if (!username && email) {
        username = email.split('@')[0].toLowerCase() + Math.floor(1000 + Math.random() * 9000).toString();
    }

    try {
        const user = await User.create({
            username,
            email,
            password
        });

        sendTokenResponse(user, 201, res);
    } catch (err: any) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            const message = field === 'username'
                ? 'Username is already taken'
                : field === 'email'
                    ? 'Email is already registered'
                    : `${field} already exists`;

            return next(new ErrorResponse(message, 400));
        }
        next(err);
    }
});

// @desc    Login user
// @route   POST /api/v1/users/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
});

// @desc    Verify user / Update profile
// @route   PUT /api/v1/users/verify
// @access  Private
export const verifyUser = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const idCardUrl = await processAndUploadBase64Image(req.body.idCard, 'idcard', req.user.username);
    const passportUrl = await processAndUploadBase64Image(req.body.passport, 'passport', req.user.username);

    const fieldsToUpdate = {
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        sex: req.body.sex,
        phone: req.body.phone,
        dateOfBirth: req.body.dateOfBirth,
        address: req.body.address,
        area: req.body.area,
        state: req.body.state,
        country: req.body.country,
        idCard: idCardUrl,
        passport: passportUrl,
        idName: req.body.idName,
        nextOfKinName: req.body.nextOfKinName,
        nextOfKinRelation: req.body.nextOfKinRelation,
        nextOfKinPhone: req.body.nextOfKinPhone,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Get current logged in user
// @route   GET /api/v1/users/me
// @access  Private
export const getMe = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin-Staff
export const getUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const results = await paginate(User, req);
    res.status(200).json(results);
});

// @desc    Get count of unapproved business verification submissions
// @route   GET /api/v1/users/unapproved-business-count
// @access  Private/Admin-Staff
export const getUnapprovedBusinessCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const count = await User.countDocuments({
        isBusinessVerifying: true,
        isBusinessVerified: false,
    });

    res.status(200).json({
        success: true,
        count,
    });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin-Staff
export const getUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update user verification status
// @route   PUT /api/v1/users/:id/verify
// @access  Private/Admin-Staff
export const updateUserStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: req.body.isVerified }, {
        new: true,
        runValidators: true
    });

    if (!user) {
        return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update single user by admin/staff (e.g. business verification approval/rejection)
// @route   PUT /api/v1/users/:id
// @access  Private/Admin-Staff
export const updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
        return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!updatedUser) {
        return next(new ErrorResponse('Failed to update user', 500));
    }

    // Handle business verification status changes
    if (req.body.isBusinessVerified !== undefined || req.body.isBusinessVerifying !== undefined) {
        const unapprovedCount = await User.countDocuments({
            isBusinessVerifying: true,
            isBusinessVerified: false,
        });

        emitUnapprovedCountUpdate(unapprovedCount);

        if (req.body.isBusinessVerified === true) {
            const tpl = await renderNotificationTemplate('business_verification_approved', {
                businessName: updatedUser.businessName || updatedUser.username,
                username: updatedUser.username,
            });
            const userNotif = await Notification.create({
                recipient: updatedUser._id,
                title: tpl.title,
                message: tpl.message,
                type: tpl.type,
                link: tpl.link,
            });
            emitNotificationToUser(updatedUser._id.toString(), userNotif);
        } else if (req.body.isBusinessVerified === false) {
            const tpl = await renderNotificationTemplate('business_verification_rejected', {
                businessName: updatedUser.businessName || updatedUser.username,
                username: updatedUser.username,
                rejectionReason: req.body.rejectionReason || 'Verification details did not meet requirements.',
            });
            const userNotif = await Notification.create({
                recipient: updatedUser._id,
                title: tpl.title,
                message: tpl.message,
                type: tpl.type,
                link: tpl.link,
            });
            emitNotificationToUser(updatedUser._id.toString(), userNotif);
        }
    }

    res.status(200).json({
        success: true,
        data: updatedUser,
    });
});

// @desc    Update user profile (Settings)
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const pictureUrl = await processAndUploadBase64Image(req.body.picture, 'profile', req.user.username);
    const businessBannerUrl = await processAndUploadBase64Image(req.body.businessBanner, 'banner', req.user.username);
    const cacDocumentUrl = await processAndUploadBase64Image(req.body.cacDocument, 'cac', req.user.username);

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
        return next(new ErrorResponse('User not found', 404));
    }

    if (currentUser.isBusinessVerified) {
        return next(new ErrorResponse('Your business profile is verified and locked from editing.', 400));
    }

    const fieldsToUpdate: any = {
        email: req.body.email,
        phone: req.body.phone,
    };

    if (req.body.accountType) fieldsToUpdate.accountType = req.body.accountType;
    if (req.body.merchantType !== undefined) fieldsToUpdate.merchantType = req.body.merchantType;
    if (req.body.merchantSubCategories !== undefined) fieldsToUpdate.merchantSubCategories = req.body.merchantSubCategories;
    if (req.body.agentSpecialization !== undefined) fieldsToUpdate.agentSpecialization = req.body.agentSpecialization;
    if (req.body.isBusinessRegistered !== undefined) fieldsToUpdate.isBusinessRegistered = req.body.isBusinessRegistered;
    if (req.body.businessName !== undefined) fieldsToUpdate.businessName = req.body.businessName;
    if (req.body.businessEmail !== undefined) fieldsToUpdate.businessEmail = req.body.businessEmail;
    if (businessBannerUrl !== undefined) fieldsToUpdate.businessBanner = businessBannerUrl;
    if (req.body.officeAddress !== undefined) fieldsToUpdate.officeAddress = req.body.officeAddress;
    if (cacDocumentUrl !== undefined) fieldsToUpdate.cacDocument = cacDocumentUrl;
    if (req.body.bankName !== undefined) fieldsToUpdate.bankName = req.body.bankName;
    if (req.body.accountName !== undefined) fieldsToUpdate.accountName = req.body.accountName;
    if (req.body.accountNumber !== undefined) fieldsToUpdate.accountNumber = req.body.accountNumber;
    if (req.body.coverageCountry !== undefined) fieldsToUpdate.coverageCountry = req.body.coverageCountry;
    if (req.body.coverageState !== undefined) fieldsToUpdate.coverageState = req.body.coverageState;
    if (req.body.coverageArea !== undefined) fieldsToUpdate.coverageArea = req.body.coverageArea;
    if (req.body.coverageType !== undefined) fieldsToUpdate.coverageType = req.body.coverageType;
    if (req.body.bio !== undefined) fieldsToUpdate.bio = req.body.bio;
    if (req.body.website !== undefined) fieldsToUpdate.website = req.body.website;

    if (pictureUrl) fieldsToUpdate.picture = pictureUrl;

    const newAccountType = req.body.accountType || currentUser.accountType;
    const isBusinessAccount = newAccountType === 'Agent' || newAccountType === 'Merchant';
    const isSubmittingBusiness = isBusinessAccount && (req.body.isBusinessRegistered || fieldsToUpdate.isBusinessRegistered || currentUser.isBusinessRegistered);

    if (isSubmittingBusiness && !currentUser.isBusinessVerified) {
        fieldsToUpdate.isBusinessVerifying = true;
    }

    try {
        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return next(new ErrorResponse('Failed to update user', 500));
        }

        // If business verification was submitted, create notifications and emit socket events
        if (isSubmittingBusiness && !currentUser.isBusinessVerifying && !currentUser.isBusinessVerified) {
            // 1. Create notification for user
            const userNotif = await Notification.create({
                recipient: user._id,
                title: 'Business Verification Under Review',
                message: 'Your business profile is under review and will be processed as soon as possible.',
                type: 'business_verification',
                link: '/dashboard',
            });
            emitNotificationToUser(user._id.toString(), userNotif);

            // 2. Find admins and create notifications for admins
            const admins = await User.find({ role: { $in: ['admin', 'staff'] } });
            const businessNameStr = user.businessName || user.username;

            for (const admin of admins) {
                const adminNotif = await Notification.create({
                    recipient: admin._id,
                    title: 'New Business Verification Submitted',
                    message: `Business verification submitted by ${businessNameStr} (${user.accountType}).`,
                    type: 'business_verification',
                    link: '/team/businesses',
                });
                emitNotificationToAdmins(adminNotif);
            }

            // 3. Emit socket event for admin real-time sidebar & toast
            const unapprovedCount = await User.countDocuments({
                isBusinessVerifying: true,
                isBusinessVerified: false,
            });

            emitBusinessVerificationSubmitted({
                userId: user._id.toString(),
                username: user.username,
                businessName: user.businessName,
                accountType: user.accountType,
                unapprovedCount,
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err: any) {
        if (err.code === 11000) {
            return next(new ErrorResponse('Email is already registered to another account', 400));
        }
        next(err);
    }
});

// @desc    Update user password
// @route   PUT /api/v1/users/password
// @access  Private
export const updatePassword = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return next(new ErrorResponse('Please provide current and new password', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
        return next(new ErrorResponse('Incorrect current password', 401));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        data: 'Password updated successfully'
    });
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
export const deleteAccount = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { password } = req.body;

    if (!password) {
        return next(new ErrorResponse('Please provide password to authorize deletion', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return next(new ErrorResponse('Incorrect password', 401));
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
        success: true,
        data: 'Account deleted successfully'
    });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user: any, statusCode: number, res: Response) => {
    const token = user.getSignedJwtToken();

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            picture: user.picture,
            role: user.role,
            accountType: user.accountType,
            merchantType: user.merchantType,
            merchantSubCategories: user.merchantSubCategories,
            agentSpecialization: user.agentSpecialization,
            isBusinessRegistered: user.isBusinessRegistered,
            isBusinessVerifying: user.isBusinessVerifying,
            isBusinessVerified: user.isBusinessVerified,
            rejectionReason: user.rejectionReason,
            businessName: user.businessName,
            businessEmail: user.businessEmail,
            businessBanner: user.businessBanner,
            officeAddress: user.officeAddress,
            cacDocument: user.cacDocument,
            bankName: user.bankName,
            accountName: user.accountName,
            accountNumber: user.accountNumber,
            coverageCountry: user.coverageCountry,
            coverageState: user.coverageState,
            coverageArea: user.coverageArea,
            coverageType: user.coverageType,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            sex: user.sex,
            phone: user.phone,
            bio: user.bio,
            website: user.website,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            area: user.area,
            state: user.state,
            country: user.country,
            idCard: user.idCard,
            idName: user.idName,
            passport: user.passport,
            isVerified: user.isVerified,
            nextOfKinName: user.nextOfKinName,
            nextOfKinRelation: user.nextOfKinRelation,
            nextOfKinPhone: user.nextOfKinPhone,
        }
    });
};
