/**
 * EagleView OAuth2 Authentication Service
 *
 * Uses Client Credentials flow to obtain and cache access tokens.
 * Tokens are refreshed automatically 60s before expiry.
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';

const TOKEN_URL = config.integrations.eagleview.tokenUrl;
const CLIENT_ID = config.integrations.eagleview.clientId;
const CLIENT_SECRET = config.integrations.eagleview.clientSecret;

// ── Token cache ──────────────────────────────────────────────────────────

interface TokenCache {
    accessToken: string;
    expiresAt: number; // unix ms
}

let tokenCache: TokenCache | null = null;

const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewAuthService {
    /**
     * Get a valid access token, refreshing if needed.
     * Throws if credentials are not configured.
     */
    async getToken(): Promise<string> {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error(
                'EagleView credentials not configured. Set EAGLEVIEW_CLIENT_ID and EAGLEVIEW_CLIENT_SECRET.',
            );
        }

        // Return cached token if still valid
        if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
            return tokenCache.accessToken;
        }

        return this.fetchNewToken();
    }

    /**
     * Fetch a new OAuth2 token from EagleView.
     */
    private async fetchNewToken(): Promise<string> {
        logger.info('[EagleView] Requesting new OAuth2 access token');

        try {
            const response = await axios.post(
                TOKEN_URL,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: CLIENT_ID!,
                    client_secret: CLIENT_SECRET!,
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 15_000,
                },
            );

            const { access_token, expires_in } = response.data;

            if (!access_token) {
                throw new Error('No access_token in EagleView OAuth response');
            }

            // Cache the token
            const expiresInMs = (expires_in || 3600) * 1000;
            tokenCache = {
                accessToken: access_token,
                expiresAt: Date.now() + expiresInMs,
            };

            logger.info('[EagleView] Token acquired, expires in %ds', expires_in || 3600);
            return access_token;
        } catch (error: any) {
            logger.error('[EagleView] Token request failed', {
                status: error?.response?.status,
                message: error?.response?.data?.error_description || error.message,
            });
            throw new Error(`EagleView authentication failed: ${error.message}`);
        }
    }

    /**
     * Check if EagleView is configured.
     */
    isConfigured(): boolean {
        return Boolean(CLIENT_ID && CLIENT_SECRET);
    }

    /**
     * Invalidate cached token (e.g. after a 401).
     */
    invalidateToken(): void {
        tokenCache = null;
        logger.info('[EagleView] Token cache invalidated');
    }
}

export const eagleViewAuthService = new EagleViewAuthService();
