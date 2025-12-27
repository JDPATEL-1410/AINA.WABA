
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "DELETE", "PUT"],
        credentials: true
    },
    transports: ['polling', 'websocket']
});

const PORT = process.env.PORT || 3000;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_secure_token';

// --- FILE UPLOAD CONFIG ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });


// --- DATABASE CONNECTION (MONGODB) ---
import connectDB, { User, Ledger, Automation, Plan, Pack, BusinessProfile } from './database/mongodb.js';

// --- INITIAL DATA SEEDING ---
const seedData = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            await User.create([
                { name: 'Acme Corp', email: 'user@company.com', password_hash: 'user123', role: 'USER', plan: 'STARTER', status: 'ACTIVE', credits: 500 },
                { name: 'Super Admin', email: 'admin@reseller.com', password_hash: 'admin', role: 'SUPER_ADMIN', plan: 'ENTERPRISE', status: 'ACTIVE', credits: 999999 }
            ]);
            console.log("✅ Seeded initial users");
        }

        const planCount = await Plan.countDocuments();
        if (planCount === 0) {
            await Plan.create([
                { name: 'FREE TRIAL', price: 0, currency: 'INR', contact_limit: 100, daily_message_limit: 50, features: ['Basic Inbox', 'No Broadcasts'], is_active: true },
                { name: 'STARTER', price: 999, currency: 'INR', contact_limit: 2000, daily_message_limit: 1000, features: ['Campaigns', 'Basic Automation'], is_active: true },
                { name: 'BUSINESS', price: 2499, currency: 'INR', contact_limit: 10000, daily_message_limit: 5000, features: ['Advanced Flows', 'API Access', 'Priority Support'], is_active: true }
            ]);
            console.log("✅ Seeded initial plans");
        }

        const packCount = await Pack.countDocuments();
        if (packCount === 0) {
            await Pack.create([
                { name: 'Starter Bundle', credits: 1000, price: 500, currency: 'INR', is_popular: false },
                { name: 'Growth Pack', credits: 5000, price: 2000, currency: 'INR', is_popular: true },
                { name: 'Enterprise Bulk', credits: 20000, price: 7000, currency: 'INR', is_popular: false }
            ]);
            console.log("✅ Seeded initial packs");
        }

        const autoCount = await Automation.countDocuments();
        if (autoCount === 0) {
            await Automation.create([
                { name: 'Price Inquiry', trigger_type: 'KEYWORD_MATCH', keywords: ['price', 'cost', 'plan'], response_type: 'TEXT', response_content: 'Our plans start at ₹999/month. Reply "plans" to see full details.', is_active: true },
                { name: 'Hello', trigger_type: 'EXACT_MATCH', keywords: ['hi', 'hello'], response_type: 'TEXT', response_content: 'Hello! Welcome to Aina WA. How can we help you today?', is_active: true }
            ]);
            console.log("✅ Seeded initial automations");
        }
    } catch (err) {
        console.error("❌ Seeding Error:", err);
    }
};

seedData();


app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- MIDDLEWARE: LICENSE CHECK ---
const checkActiveSubscription = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return next();

    try {
        const user = await User.findById(userId);
        if (user && user.status !== 'ACTIVE') {
            return res.status(403).json({ error: "License Suspended. Please contact support." });
        }
        next();
    } catch (e) {
        next();
    }
};



// --- HELPERS ---

async function updateUserBalance(userId, amount) {
    await User.findByIdAndUpdate(userId, { $inc: { credits: amount } });
}

async function deductCredits(userId, amount) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.credits < amount) throw new Error("Insufficient credits");
    user.credits -= amount;
    await user.save();
}

async function logLedger(userId, amount, type, description, actorId = null) {
    await Ledger.create({
        user_id: userId,
        amount,
        transaction_type: type,
        description,
        created_by: actorId
    });
}


// --- ADMIN ROUTES ---


app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            activeUsers: await User.countDocuments({ status: 'ACTIVE' }),
            totalMessages24h: 1250,
            revenueMonth: 45000,
            webhookFailures: 5
        };
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});



app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find().sort({ created_at: -1 });
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});


app.post('/api/users/:id/credits', async (req, res) => {
    const { id } = req.params;
    const { amount, adminId, reason } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: "Invalid amount" });
    try {
        await updateUserBalance(id, parseFloat(amount));
        await logLedger(id, parseFloat(amount), amount > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT', reason || 'Manual Admin Update', adminId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


app.put('/api/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await User.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.password_hash !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});



app.post('/api/users', async (req, res) => {
    const { name, email, password, role, plan } = req.body;
    try {
        const newUser = await User.create({
            name, email, password_hash: password, role: role || 'USER', plan: plan || 'TRIAL'
        });
        res.json(newUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});



// --- AUTOMATION ROUTES ---

app.get('/api/automations', async (req, res) => {
    try {
        const autos = await Automation.find();
        res.json(autos);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/automations', async (req, res) => {
    try {
        const rule = await Automation.create(req.body);
        res.json(rule);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/automations/:id', async (req, res) => {
    try {
        await Automation.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- BILLING ROUTES ---


app.get('/api/billing/plans', async (req, res) => {
    try {
        const plans = await Plan.find({ is_active: true });
        res.json(plans);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/billing/plans', async (req, res) => {
    try {
        const plan = await Plan.create(req.body);
        res.json(plan);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/billing/plans/:id', async (req, res) => {
    try {
        await Plan.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/billing/packs', async (req, res) => {
    try {
        const packs = await Pack.find();
        res.json(packs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/billing/packs', async (req, res) => {
    try {
        const pack = await Pack.create(req.body);
        res.json(pack);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/billing/packs/:id', async (req, res) => {
    try {
        await Pack.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/billing/transactions', async (req, res) => {
    const userId = req.headers['x-user-id'];
    try {
        if (userId) {
            const ledgers = await Ledger.find({ user_id: userId }).sort({ created_at: -1 });
            res.json(ledgers);
        } else {
            res.json([]);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/billing/create-order', async (req, res) => {
    const { userId, packageId, amount, credits } = req.body;
    try {
        // MOCK PAYMENT PROCESS
        // 1. In real app, create Razorpay/Stripe order here
        // 2. For now, immediately credit
        await updateUserBalance(userId, credits);
        await logLedger(userId, amount, 'PURCHASE', `Bought ${credits} Credits (Pack: ${packageId})`);

        res.json({ success: true, orderId: `ord_${Date.now()}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- MEDIA UPLOAD ---
app.post('/api/media/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    // In production, upload to S3/Cloudinary and return public URL
    // For local, return relative path
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ id: req.file.filename, url: fileUrl });
});

// --- MESSAGING ROUTES (WITH LICENSE CHECK) ---

app.post('/api/messages/text', checkActiveSubscription, async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { to, text } = req.body;

    try {
        // 1. Check & Deduct Credits
        if (userId) {
            const COST = 1;
            await deductCredits(userId, COST);
        }

        // 2. Send to Real WhatsApp API (Mocked here)
        // const response = await axios.post(`https://graph.facebook.com/v18.0/${phoneId}/messages`, { ... }, { headers: { Authorization: `Bearer ${token}` } });

        // 3. Emit Socket Event for Real-time Updates (Simulating delivery)
        setTimeout(() => {
            io.emit('new_message', {
                id: `wamid.${Date.now()}`,
                text,
                sender: 'me',
                timestamp: new Date().toISOString(),
                status: 'SENT',
                type: 'text'
            });
        }, 500);

        res.json({ messages: [{ id: `wamid.${Date.now()}` }] });
    } catch (e) {
        console.error("Message Send Error:", e.message);
        res.status(402).json({ error: e.message || "Payment Required" });
    }
});

app.post('/api/messages/template', checkActiveSubscription, async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { to, templateName } = req.body;

    try {
        if (userId) await deductCredits(userId, 1.5);
        res.json({ messages: [{ id: `wamid.${Date.now()}` }] });
    } catch (e) {
        res.status(402).json({ error: e.message });
    }
});

app.post('/api/messages/media', checkActiveSubscription, async (req, res) => {
    const userId = req.headers['x-user-id'];
    try {
        if (userId) await deductCredits(userId, 2);
        res.json({ messages: [{ id: `wamid.${Date.now()}` }] });
    } catch (e) {
        res.status(402).json({ error: e.message });
    }
});

app.post('/api/messages/interactive', checkActiveSubscription, async (req, res) => {
    const userId = req.headers['x-user-id'];
    try {
        if (userId) await deductCredits(userId, 1);
        res.json({ messages: [{ id: `wamid.${Date.now()}` }] });
    } catch (e) {
        res.status(402).json({ error: e.message });
    }
});

// --- WHATSAPP OFFICIAL WEBHOOKS ---

// 1. Verification Request from Meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. Incoming Event Notification (Enhanced for Chatbot)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            const msg = body.entry[0].changes[0].value.messages[0];
            const contact = body.entry[0].changes[0].value.contacts?.[0];
            const incomingText = msg.text?.body?.toLowerCase();

            // Emit to frontend clients (Main Inbox Flow)
            io.emit('new_message', {
                id: msg.id,
                text: msg.text?.body,
                senderPhone: msg.from,
                senderName: contact?.profile?.name || msg.from,
                timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
                type: msg.type, // 'text', 'image', etc.
                status: 'DELIVERED',
                mediaUrl: msg.image?.id
            });


            // --- CHATBOT LOGIC ---
            if (incomingText) {
                const rules = await Automation.find({ is_active: true });
                const rule = rules.find(a => {
                    if (a.trigger_type === 'EXACT_MATCH') return a.keywords.includes(incomingText);
                    if (a.trigger_type === 'KEYWORD_MATCH') return a.keywords.some(k => incomingText.includes(k));
                    return false;
                });


                if (rule) {
                    console.log(`[Chatbot] Matched rule "${rule.name}" for message: "${incomingText}"`);
                    // Simulate Bot Response delay
                    setTimeout(() => {
                        io.emit('new_message', {
                            id: `auto_${Date.now()}`,
                            text: rule.response_content,
                            sender: 'me',
                            timestamp: new Date().toISOString(),
                            status: 'SENT',
                            type: 'text',
                            senderPhone: msg.from // Echo back to same chat for UI
                        });
                    }, 1000);
                }
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});


// --- WHATSAPP ONBOARDING MOCKS ---


app.post('/api/auth/exchange-token', async (req, res) => {
    const { code, userId } = req.body;
    const mockCreds = {
        accessToken: "mock_access_token_" + Date.now(),
        wabaId: "waba_" + Math.random().toString(36).substr(2, 8),
        businessAccountId: "biz_" + Math.random().toString(36).substr(2, 8),
        facebookPageId: "page_" + Math.random().toString(36).substr(2, 8)
    };

    try {
        await User.findByIdAndUpdate(userId, { apiCredentials: mockCreds });
        res.json({ success: true, credentials: mockCreds });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.get('/api/whatsapp/phone-numbers', async (req, res) => {
    const mockPhones = [
        {
            id: "phone_" + Math.random().toString(36).substr(2, 6),
            display_phone_number: "+1 555 012 3456",
            verified_name: "My Business",
            quality_rating: "GREEN",
            code_verification_status: "VERIFIED"
        }
    ];
    setTimeout(() => { res.json({ data: mockPhones }); }, 500);
});

app.post('/api/whatsapp/register-phone', async (req, res) => {
    setTimeout(() => { res.json({ success: true }); }, 1000);
});


app.get('/api/whatsapp/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const profile = await BusinessProfile.findOne({ user_id: userId });
        res.json({ data: [profile || { address: 'No address set', description: 'No description' }] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/whatsapp/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const profileData = req.body;
        await BusinessProfile.findOneAndUpdate(
            { user_id: userId },
            { ...profileData, user_id: userId },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/flows', (req, res) => {
    res.json({ data: [] });
});

app.post('/api/flows', (req, res) => {
    res.json({ id: `flow_${Date.now()}` });
});

app.get('/api/proxy/templates', (req, res) => {
    res.json({ data: [] });
});

// --- STATIC SERVE ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});



const startServer = async () => {
    try {
        await connectDB();
        await seedData();

        if (process.env.NODE_ENV !== 'production' || process.env.VITE_DEV_SERVER) {
            httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} | Database: MongoDB`));
        }
    } catch (err) {
        console.error("Failed to start server:", err);
    }
};

startServer();

export default app;

