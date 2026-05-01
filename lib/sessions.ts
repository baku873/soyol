import { getCollection } from '@/lib/mongodb';

/**
 * Parse a raw User-Agent string into a human-readable device name.
 * Uses simple string matching — no external library needed.
 */
export function parseDeviceName(ua: string | null | undefined): string {
    if (!ua) return 'Тодорхойгүй төхөөрөмж';

    let browser = 'Browser';
    let os = '';

    // --- Browser detection (order matters: check specific before generic) ---
    if (ua.includes('Edg/') || ua.includes('Edge/')) browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
    else if (ua.includes('YaBrowser')) browser = 'Yandex';
    else if (ua.includes('CriOS')) browser = 'Chrome';
    else if (ua.includes('FxiOS') || ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

    // --- OS / device detection ---
    if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('CrOS')) os = 'ChromeOS';

    return os ? `${browser} on ${os}` : browser;
}

/**
 * Insert a new session document into the `sessions` collection.
 * Call this after successful login / OAuth callback.
 */
export async function createSession(opts: {
    userId: string;
    userAgent: string | null;
    ip: string;
    sessionToken?: string;
}) {
    const col = await getCollection('sessions');
    const now = new Date();

    await col.insertOne({
        userId: opts.userId,
        userAgent: opts.userAgent || 'unknown',
        device: parseDeviceName(opts.userAgent),
        ip: opts.ip,
        sessionToken: opts.sessionToken,
        createdAt: now,
        lastSeen: now,
    });
}
