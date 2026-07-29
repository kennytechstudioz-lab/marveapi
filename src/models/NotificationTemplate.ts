import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationTemplate extends Document {
    code: string;
    name: string;
    titleTemplate: string;
    messageTemplate: string;
    type: string;
    linkTemplate?: string;
    createdAt: Date;
    updatedAt: Date;
}

const notificationTemplateSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    titleTemplate: { type: String, required: true },
    messageTemplate: { type: String, required: true },
    type: { type: String, default: 'business_verification' },
    linkTemplate: { type: String, default: '/dashboard' },
}, { timestamps: true });

const NotificationTemplate = mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;
