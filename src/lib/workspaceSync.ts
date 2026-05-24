import toast from 'react-hot-toast';

// In-memory cache for Google OAuth token and connected user email
let cachedAccessToken: string | null = null;
let cachedUserEmail: string | null = null;
let cachedSelectedChatSpace: string | null = null;

// Persistent key for selected chat space in local storage so choices are saved
const GCHAT_SPACE_KEY = 'inmarket_gchat_alerts_space_id';

export const setWorkspaceToken = (token: string | null) => {
  cachedAccessToken = token;
  if (!token) {
    cachedUserEmail = null;
  }
};

export const getWorkspaceToken = (): string | null => {
  return cachedAccessToken;
};

export const setWorkspaceUserEmail = (email: string | null) => {
  cachedUserEmail = email;
};

export const getWorkspaceUserEmail = (): string | null => {
  return cachedUserEmail;
};

export const setSelectedChatSpaceId = (spaceId: string | null) => {
  cachedSelectedChatSpace = spaceId;
  if (spaceId) {
    localStorage.setItem(GCHAT_SPACE_KEY, spaceId);
  } else {
    localStorage.removeItem(GCHAT_SPACE_KEY);
  }
};

export const getSelectedChatSpaceId = (): string | null => {
  if (!cachedSelectedChatSpace) {
    cachedSelectedChatSpace = localStorage.getItem(GCHAT_SPACE_KEY);
  }
  return cachedSelectedChatSpace;
};

/**
 * 1. Gmail Integration - Send Automated Report
 */
export async function sendGmailReport(
  token: string,
  recipient: string,
  subject: string,
  reportType: string,
  contentStr: string
): Promise<any> {
  const finalRecipient = recipient.trim();
  if (!finalRecipient) {
    throw new Error('Recipient email is missing.');
  }

  // Gmail API users.messages.send expects a raw base64url encoded MIME message
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${finalRecipient}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #c084fc; border-radius: 16px; background: #fafafa; color: #1e1b4b; line-height: 1.5;">`,
    `  <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 16px; border-radius: 12px; margin-bottom: 20px;">`,
    `    <h2 style="margin: 0; font-size: 18px; font-weight: 800; tracking-wide">INMARKET AUTOMATED REPORT</h2>`,
    `    <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">Secure Ledger Export Node (AES_256_VERIFIED)</p>`,
    `  </div>`,
    `  <p style="font-size: 13px;">Berikut adalah transkrip laporan resmi <strong>${reportType.toUpperCase()}</strong> yang ditarik secara dinamis dari buffer memory usaha Anda:</p>`,
    `  <div style="background: #0f172a; color: #38bdf8; font-family: 'Courier New', Courier, monospace; padding: 16px; border-radius: 12px; white-space: pre-wrap; font-size: 11px; line-height: 1.6; border: 1px solid #334155; margin: 18px 0; max-height: 350px; overflow-y: auto;">${contentStr.replace(/\n/g, '<br>')}</div>`,
    `  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">`,
    `  <p style="font-size: 11px; color: #64748b; margin: 0; font-style: italic;">Sistem otomasi laporan terintegrasi penuh ke Google Workspace. Kredensial diamankan via TLS 1.3 & Google OAuth 2.0.</p>`,
    `</div>`
  ];
  const email = emailLines.join('\r\n');
  const base64Safe = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Safe,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API failure: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * 2. Google Chat Integration - Post Real-time Alert
 */
export async function postGoogleChatAlert(
  token: string,
  spaceId: string,
  message: string
): Promise<any> {
  const cleanSpace = spaceId.startsWith('spaces/') ? spaceId : `spaces/${spaceId}`;

  const response = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Chat API failure: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * 3. Google Calendar - Sync Shift / Agenda Schedule
 */
export async function syncAgendaToGoogleCalendar(
  token: string,
  title: string,
  employeeName: string,
  dateStr: string, // YYYY-MM-DD
  timeIn: string,  // HH:MM
  timeOut: string, // HH:MM
  status: string,
  notes: string,
  location: string
): Promise<any> {
  // ISO-8601 formatting
  const startDateTime = `${dateStr}T${timeIn}:00`;
  const endDateTime = `${dateStr}T${timeOut}:00`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

  const response = await fetch('https://calendar.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `InMarket Shift: ${employeeName} - ${status}`,
      location: location || 'Toko Utama InMarket',
      description: `Pekerjaan/Tugas: ${title || 'Dinas Operasional'}\nCatatan Khusus: ${notes || '-'}\nPresensi Status: ${status}`,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar API failure: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * Helper to check and fire a real-time sale transaction alert to active Google Chat space if provisioned
 */
export async function triggerRealtimeSaleChatAlert(
  newSale: { id: string; total: number; meth: string; items: any[] }
): Promise<void> {
  const token = getWorkspaceToken();
  const spaceId = getSelectedChatSpaceId();

  if (!token || !spaceId) {
    return; // Workspace Google Chat is not active/selected
  }

  try {
    const itemList = newSale.items.map(item => `- ${item.name} x${item.qty}`).join('\n');
    const boldTitle = `💰 *[INMARKET TRANSACTION REVENUE ALERT]*`;
    const message = `${boldTitle}\n\n*ID Transaksi:* ${newSale.id}\n*Metode:* ${newSale.meth.toUpperCase()}\n*Total Pendapatan:* Rp ${newSale.total.toLocaleString('id-ID')}\n\n*Daftar Produk Terbeli:*\n${itemList || '_Tidak ada item produk terdaftar_'} \n\n_Auto-synced via InMarket Real-time Bot AI_`;

    await postGoogleChatAlert(token, spaceId, message);
    console.log('Real-time checkout alert successfully posted to Google Chat space:', spaceId);
  } catch (err: any) {
    console.warn('Silent failure on Google Chat automatic checkout log:', err.message);
  }
}
