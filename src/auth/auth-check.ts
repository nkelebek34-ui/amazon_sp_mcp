/**
 * Non-sensitive LWA auth verification.
 * Returns only a pass/fail verdict and an error category — never a secret,
 * token, or any substring derived from one.
 */

import { CredentialsManager } from './credentials.js';
import { TokenManager } from './token-manager.js';

export type AuthCheckCategory =
  | 'MISSING_CREDENTIALS'
  | 'INVALID_GRANT'
  | 'INVALID_CLIENT'
  | 'NETWORK_ERROR'
  | 'EMPTY_TOKEN'
  | 'UNKNOWN';

export interface AuthCheckResult {
  success: boolean;
  category?: AuthCheckCategory;
}

function categorize(error: unknown): AuthCheckCategory {
  if (!(error instanceof Error)) return 'UNKNOWN';
  const msg = error.message;
  if (msg.includes('Missing required credentials')) return 'MISSING_CREDENTIALS';
  if (msg.includes('invalid_grant')) return 'INVALID_GRANT';
  if (msg.includes('invalid_client')) return 'INVALID_CLIENT';
  if (msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
    return 'NETWORK_ERROR';
  }
  if (msg.includes('empty access token')) return 'EMPTY_TOKEN';
  return 'UNKNOWN';
}

export async function checkAuthentication(): Promise<AuthCheckResult> {
  try {
    const credManager = new CredentialsManager();
    const tokenManager = new TokenManager(credManager.getLWACredentials());
    const accessToken = await tokenManager.getAccessToken();

    if (!accessToken || accessToken.length === 0) {
      throw new Error('Received empty access token');
    }

    return { success: true };
  } catch (error) {
    return { success: false, category: categorize(error) };
  }
}
