import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'business_verification' | 'system' | 'general' | 'listing';
    isRead: boolean;
    link?: string;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema: Schema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['business_verification', 'system', 'general', 'listing'],
            default: 'system',
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        link: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
