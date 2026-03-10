import { google } from 'googleapis';
import type { PrismaClient } from '@prisma/client';

export class CalendarAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarAuthExpiredError';
  }
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function extractAuthErrorMessage(error: unknown): string {
  const err = error as { message?: string; response?: { data?: { error?: string; error_description?: string } } };
  const apiError = err.response?.data?.error_description || err.response?.data?.error;
  return apiError || err.message || 'Google token refresh failed';
}

export async function refreshGoogleTokenForSitter(params: {
  db: PrismaClient;
  sitterId: string;
  refreshToken: string;
}): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: params.refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    await params.db.sitter.update({
      where: { id: params.sitterId },
      data: {
        googleAccessToken: credentials.access_token ?? null,
        googleRefreshToken: credentials.refresh_token ?? params.refreshToken,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        googleAuthExpired: false,
        googleAuthError: null,
      },
    });

    return oauth2Client;
  } catch (error) {
    const message = extractAuthErrorMessage(error);
    await params.db.sitter.update({
      where: { id: params.sitterId },
      data: {
        googleAuthExpired: true,
        googleAuthError: message,
      },
    });
    throw new CalendarAuthExpiredError(message);
  }
}
