/**
 * Ably Client Initialization
 * Provides a singleton Ably Realtime client for chat messaging.
 */

import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

/**
 * Returns a singleton Ably Realtime client instance.
 * Uses token auth via the /api/ably/auth endpoint.
 */
export function getAblyClient(): Ably.Realtime {
  if (ablyClient) return ablyClient;

  ablyClient = new Ably.Realtime({
    authUrl: '/api/ably/auth',
    authMethod: 'GET',
    autoConnect: true,
    echoMessages: false,
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
