/**
 * Ably Client Initialization
 * Provides a singleton Ably Realtime client for chat messaging.
 */

import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

/**
 * Returns a singleton Ably Realtime client instance.
 * Uses token auth via the /api/ably/auth endpoint.
 *
 * Uses `authCallback` instead of `authUrl` so failed token requests are passed
 * to Ably via the callback (avoids unhandled rejections / Next overlay:
 * "Client configured authentication provider request failed").
 */
export function getAblyClient(): Ably.Realtime {
  if (ablyClient) return ablyClient;

  ablyClient = new Ably.Realtime({
    authCallback: (tokenParams, callback) => {
      fetch('/api/ably/auth', { credentials: 'same-origin' })
        .then(async (res) => {
          if (!res.ok) {
            const detail = await res.text().catch(() => res.statusText);
            callback(`Ably auth HTTP ${res.status}: ${detail.slice(0, 200)}`, null);
            return;
          }
          const json = await res.json();
          callback(null, json as Parameters<typeof callback>[1]);
        })
        .catch((err: unknown) => {
          callback(err instanceof Error ? err.message : String(err), null);
        });
    },
    autoConnect: true,
    echoMessages: false,
  });

  ablyClient.connection.on('failed', (stateChange) => {
    console.warn('[Ably] connection failed:', stateChange.reason);
  });

  return ablyClient;
}

/**
 * Close and cleanup the Ably client.
 */
export function closeAblyClient(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
  }
}
