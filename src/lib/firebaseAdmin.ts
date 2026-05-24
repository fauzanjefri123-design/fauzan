import admin from 'firebase-admin';

if (!admin.apps.length) {
  const adminKeyBase64 = process.env.FIREBASE_ADMIN_KEY;
  if (adminKeyBase64) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(adminKeyBase64, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized');
    } catch (e) {
      console.error('Failed to initialize Firebase Admin:', e);
    }
  } else {
    console.warn('FIREBASE_ADMIN_KEY not found, admin operations will fail');
  }
}

export const auth = admin.apps.length ? admin.auth() : null;
export const db = admin.apps.length ? admin.firestore() : null;
