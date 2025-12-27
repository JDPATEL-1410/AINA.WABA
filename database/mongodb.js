
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        if (mongoose.connection.readyState >= 1) {
            return;
        }

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // Wait 30s before failing
            socketTimeoutMS: 45000,
        });
        console.log('🍃 Connected to MongoDB Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        if (error.message.includes('whitelsited') || error.message.includes('IP address')) {
            console.error('👉 PRO TIP: Double check your MongoDB Atlas "Network Access" for 0.0.0.0/0');
        }
        throw error; // Rethrow to let startServer handle it
    }
};

export default connectDB;

// Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'USER' },
    plan: { type: String, default: 'TRIAL' },
    status: { type: String, default: 'ACTIVE' },
    credits: { type: Number, default: 0 },
    apiCredentials: {
        accessToken: String,
        wabaId: String,
        businessAccountId: String,
        facebookPageId: String,
        phoneNumberId: String
    },
    created_at: { type: Date, default: Date.now }
});

const ledgerSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    transaction_type: { type: String, required: true },
    description: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

const automationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    trigger_type: { type: String, required: true },
    keywords: [String],
    response_type: { type: String, default: 'TEXT' },
    response_content: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

const planSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    contact_limit: Number,
    daily_message_limit: Number,
    features: [String],
    is_active: { type: Boolean, default: true }
});

const packSchema = new mongoose.Schema({
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    is_popular: { type: Boolean, default: false }
});

const businessProfileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messaging_product: { type: String, default: 'whatsapp' },
    address: String,
    description: String,
    vertical: String,
    email: String,
    websites: [String],
    profile_picture_url: String
});

export const User = mongoose.model('User', userSchema);
export const Ledger = mongoose.model('Ledger', ledgerSchema);
export const Automation = mongoose.model('Automation', automationSchema);
export const Plan = mongoose.model('Plan', planSchema);
export const Pack = mongoose.model('Pack', packSchema);
export const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);
