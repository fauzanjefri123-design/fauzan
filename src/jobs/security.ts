import { task, schedules } from "@trigger.dev/sdk/v3";
import { Resend } from 'resend';
import { db } from '../lib/firebaseAdmin';
import { redis } from '../lib/redis';

const resend = new Resend(process.env.RESEND_API_KEY);

// Job 1 - Security Alert Real-time
export const securityAlertTask = task({
  id: "security-alerts",
  run: async (payload: { type: string, userId: string, ip: string, details: any }) => {
    const { type, userId, ip, details } = payload;

    if (type === 'brute_force_lockout') {
      await resend.emails.send({
        from: 'InMarket Security <security@inmarket.id>',
        to: details.ownerEmail,
        subject: '⚠️ Security Alert: Brute Force Attempt Detected',
        text: `Brute force lockout for user ${userId} at IP ${ip}.`,
      });
    }

    if (type === 'suspicious_login') {
       if (db) {
         await db.collection('users').doc(userId).update({ flagged: true });
       }
    }

    console.log(`Security event processed: ${type}`);
  },
});

// Job 2 - Daily Security Report
export const dailyReportTask = schedules.task({
  id: "daily-report",
  cron: "59 23 * * *", // 23:59 WIB
  run: async (payload) => {
    if (!db) return;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const loginLogs = await db.collection('loginLogs')
      .where('timestamp', '>=', today)
      .get();
      
    const count = loginLogs.size;
    
    await resend.emails.send({
      from: 'InMarket Reports <reports@inmarket.id>',
      to: 'admin@inmarket.id',
      subject: `Daily Security Report - ${today.toLocaleDateString()}`,
      text: `Total logins today: ${count}`,
    });

    await db.collection('securityReports').add({
      date: today.toISOString(),
      logCount: count,
      status: 'VERIFIED',
      ownerId: 'SYSTEM'
    });
  },
});

// Job 3 - Attendance Code Rotator
export const attendanceRotatorTask = schedules.task({
  id: "attendance-rotator",
  cron: "1 0 * * *", // 00:01 WIB
  run: async () => {
    const owners = await db?.collection('users').where('role', '==', 'Owner').get();
    
    for (const doc of owners?.docs || []) {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await redis.set(`attendance:${doc.id}`, newCode, 'EX', 86400);
    }
  },
});

// Job 4 - Token Blacklist Cleanup
export const blacklistCleanupTask = schedules.task({
  id: "blacklist-cleanup",
  cron: "0 3 * * *", // 03:00 WIB
  run: async () => {
    const keys = await redis.keys('blacklist:*');
    let cleaned = 0;
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        cleaned++;
      }
    }
    console.log(`Cleaned ${cleaned} expired blacklisted tokens`);
  },
});
