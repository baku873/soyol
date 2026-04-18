/**
 * Resend email client with retry logic.
 *
 * ENV required:
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL  (e.g. notifications@soyol.mn)
 *   RESEND_FROM_NAME   (e.g. Soyol Video Shop)
 */

import { Resend } from 'resend';
import * as React from 'react';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

let _client: Resend | null = null;

function getResend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('[Resend] RESEND_API_KEY not configured');
  _client = new Resend(key);
  return _client;
}

function getFrom(): string {
  const name = process.env.RESEND_FROM_NAME || 'Soyol Video Shop';
  const email = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';
  return `${name} <${email}>`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

/**
 * Send an email via Resend with automatic retry.
 */
export async function sendEmail(
  to: string,
  subject: string,
  reactComponent: React.ReactElement,
  headers?: Record<string, string>,
): Promise<SendEmailResult> {
  const resend = getResend();
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: getFrom(),
        to,
        subject,
        react: reactComponent,
        headers,
      });

      if (error) {
        lastError = error.message || JSON.stringify(error);
        console.error(`[Resend] Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError);
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      console.log(`[Resend] Sent to ${to}: "${subject}" (messageId: ${data?.id})`);
      return { success: true, messageId: data?.id, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[Resend] Attempt ${attempt}/${MAX_ATTEMPTS} exception:`, lastError);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { success: false, error: lastError, attempts: MAX_ATTEMPTS };
}
