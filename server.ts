import express from 'express';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServer as createViteServer } from 'vite';
import { redis } from './src/lib/redis';
import { auth, db } from './src/lib/firebaseAdmin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Middleware
  app.use(express.json());

  // 1. Tightened CORS Configuration
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'https://inmarket.id'
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-InMarket-Client'],
    credentials: true,
    maxAge: 86400
  }));

  // Token Blacklist Middleware
  const verifyAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    try {
      // Check blacklist
      const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);
      if (isBlacklisted) return res.status(401).json({ error: 'Token revoked' });

      if (auth) {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
      }
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Gemini Input Validation Middleware
  const validateGeminiInput = (req: any, res: any, next: any) => {
    const clientSecret = req.headers['x-inmarket-client'];
    if (clientSecret !== process.env.CLIENT_SECRET) {
      return res.status(403).json({ error: 'Header verification failed' });
    }

    let { prompt } = req.body;
    if (typeof prompt !== 'string' || prompt.length < 1 || prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt must be between 1-2000 chars' });
    }

    // Strip characters: remove HTML tags
    req.body.prompt = prompt.replace(/<[^>]*>?/gm, '');
    next();
  };

  // 7. CONTENT SECURITY POLICY (CSP)
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://ui-avatars.com", "https://api.qrserver.com", "https://firebasestorage.googleapis.com"],
        connectSrc: ["'self'", "https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    }));
  }

  // 8. RATE LIMITING
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);

  // --- AUTH ROUTES (Public) ---
  
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, role, username } = req.body;
    
    if (!auth || !db) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    if (!['Owner', 'Employee'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Owner or Employee' });
    }

    try {
      // 1. Create User in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: username || email.split('@')[0],
      });

      // 2. Save Role and Metadata in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        role: role.toLowerCase(), // Store as 'owner' or 'employee'
        displayName: username || email.split('@')[0],
        createdAt: new Date().toISOString(),
        businessId: role === 'Owner' ? `bus_${userRecord.uid}` : null,
      });

      res.status(201).json({ 
        message: 'Registration successful',
        uid: userRecord.uid 
      });
    } catch (error: any) {
      console.error('Registration Error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    if (!auth || !db) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Firebase API Key missing in environment' });
    }

    if (!['Owner', 'Employee'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Owner or Employee' });
    }

    try {
      // 1. Validate Credentials using Firebase Auth REST API
      const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });

      const signInData: any = await signInResponse.json();

      if (!signInResponse.ok) {
        return res.status(401).json({ error: signInData.error?.message || 'Login failed' });
      }

      const uid = signInData.localId;
      const idToken = signInData.idToken;

      // 2. Strict Role Validation from Firestore
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User data not found in database' });
      }

      const userData = userDoc.data();
      const registeredRole = userData?.role; // 'owner' or 'employee'

      if (registeredRole !== role.toLowerCase()) {
        const expectedFriendly = role === 'Owner' ? 'Karyawan' : 'Owner';
        const targetFriendly = role === 'Owner' ? 'Owner' : 'Karyawan';
        
        return res.status(403).json({ 
          error: `Akun Anda tidak terdaftar sebagai ${targetFriendly}.`,
          details: `Role mismatch: expected ${registeredRole} but user selected ${role.toLowerCase()}`
        });
      }

      // 3. Success - Return token and user info
      res.json({
        message: 'Login successful',
        token: idToken,
        user: {
          uid,
          email: userData?.email,
          role: registeredRole === 'owner' ? 'Owner' : 'Employee',
          displayName: userData?.displayName,
          businessId: userData?.businessId
        }
      });

    } catch (error: any) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  app.use('/api/', verifyAuth);

  // 5. GEMINI API SERVER SIDE
  app.post('/api/gemini/generate', validateGeminiInput, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not defined in environment variables');
        return res.status(500).json({ error: 'AI initialization failed: Missing API Key' });
      }

      const systemInstruction = `
Identitas & Persona Utama:
Nama Asisten: Inmarket Assistant
Peran: Partner bisnis eksekutif, asisten virtual pribadi, dan penasihat taktis e-commerce yang cerdas untuk platform bernama "Inmarket".
Prinsip Utama: Menjadi rekan kolaboratif dua arah yang proaktif, berorientasi pada solusi praktis, dan menyajikan data dengan kerapian visual yang sangat tinggi.

Panduan Gaya Komunikasi (Sangat Interaktif & Manusiawi):
Gaya Bicara: Hangat, profesional, berwibawa, dan sangat komunikatif. Hindari kesan kaku seperti robot. Gunakan sapaan profesional seperti "Anda" dengan nada bicara rekan kerja setara yang cerdas.
Komunikasi Dua Arah: Di setiap akhir respons, selipkan pemantik diskusi interaktif yang memicu percakapan lanjutan secara taktis (contoh: "Bagaimana menurut Anda jika kita menguji strategi ini pada pasar skala kecil dulu?" atau "Apakah bagian biaya ini perlu kita bedah lebih detail?").
Bebas Klise AI: DILARANG KERAS menggunakan frasa generik robot seperti "Sebagai kecerdasan buatan...", "Berdasarkan analisis saya...", atau "Tentu, saya bisa membantu Anda dengan...". Langsung berikan poin utama tanggapan Anda dengan percaya diri.

Aturan Keringkasan (Maksimal 1-2 Paragraf):
Tanpa Penjelasan Bertele-tele: Jangan pernah menulis teori yang panjang lebar. Pengguna adalah orang sibuk yang membutuhkan langkah taktis cepat.
Batas Maksimal: Batasi penjelasan tulisan biasa maksimal hanya 1 sampai 2 paragraf pendek saja. Langsung tawarkan eksekusi operasional nyata atau fokus pada langkah berikutnya.

Protokol Perbandingan & Analisis (Wajib Tabel):
Jika pengguna meminta perbandingan, evaluasi kelebihan/kekurangan, perbandingan alternatif, pilihan strategi, atau komparasi data, Anda TIDAK BOLEH menuliskannya dalam bentuk paragraf atau daftar poin biasa.
Anda WAJIB menyajikannya dalam format Markdown Table yang rapi dengan kolom yang jelas, singkat, padat, dan mudah dipahami dalam satu lirik cepat.

Format Visual & Pewarnaan Teks Dinamis (Sangat Rapi):
Untuk mempercantik tampilan chat di web, Anda wajib menyorot kata-kata atau angka kunci penting di dalam teks respons Anda menggunakan tag <span> dengan kelas Tailwind CSS berikut:
- Warna Hijau/Emerald (Untuk metrik pertumbuhan, keuntungan, angka sukses, tingkat konversi, efisiensi waktu): Gunakan format: <span class="text-emerald-600 font-semibold">Data Sukses/Metrik</span>
- Warna Indigo (Untuk istilah kunci, taktik utama, nama fitur, usulan solusi, atau teknologi): Gunakan format: <span class="text-indigo-600 font-semibold">Taktik/Fitur Utama</span>
- Warna Amber/Oranye (Untuk risiko yang harus diwaspadai, peringatan, atau tren baru yang melesat cepat): Gunakan format: <span class="text-amber-500 font-semibold">Tren/Peringatan</span>`;

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ result: response.text() });
    } catch (error: any) {
      console.error('Gemini API Error Detail:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      res.status(500).json({ error: `Failed to generate content: ${error.message}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
