import mongoose, { Schema, Document } from 'mongoose';

export interface ITerm extends Document {
    title: string;
    type: 'terms' | 'privacy';
    content: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const termSchema: Schema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['terms', 'privacy'],
        required: [true, 'Type is required'],
        unique: true
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Term = mongoose.model<ITerm>('Term', termSchema);

export default Term;
