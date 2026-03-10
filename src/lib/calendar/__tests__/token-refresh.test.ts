import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshAccessTokenMock = vi.fn();
const sitterUpdateMock = vi.fn();

vi.mock('googleapis', () => {
  class MockOAuth2 {
    setCredentials = vi.fn();
    refreshAccessToken = refreshAccessTokenMock;
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2 },
    },
  };
});

import { CalendarAuthExpiredError, refreshGoogleTokenForSitter } from '@/lib/calendar/token-refresh';

describe('refreshGoogleTokenForSitter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'client';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('persists fresh token data when refresh succeeds', async () => {
    refreshAccessTokenMock.mockResolvedValueOnce({
      credentials: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expiry_date: Date.now() + 60_000,
      },
    });
    const db = {
      sitter: {
        update: sitterUpdateMock.mockResolvedValue({}),
      },
    } as any;

    await refreshGoogleTokenForSitter({
      db,
      sitterId: 's1',
      refreshToken: 'old-refresh',
    });

    expect(sitterUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({
          googleAccessToken: 'new-access',
          googleRefreshToken: 'new-refresh',
          googleAuthExpired: false,
          googleAuthError: null,
        }),
      })
    );
  });

  it('marks sitter authExpired when refresh fails', async () => {
    refreshAccessTokenMock.mockRejectedValueOnce(new Error('invalid_grant'));
    const db = {
      sitter: {
        update: sitterUpdateMock.mockResolvedValue({}),
      },
    } as any;

    await expect(
      refreshGoogleTokenForSitter({
        db,
        sitterId: 's1',
        refreshToken: 'old-refresh',
      })
    ).rejects.toBeInstanceOf(CalendarAuthExpiredError);

    expect(sitterUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({
          googleAuthExpired: true,
        }),
      })
    );
  });
});
