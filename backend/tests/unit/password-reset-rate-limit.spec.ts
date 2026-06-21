import {
  passwordResetRequestRateLimitKey,
  passwordResetSubmissionRateLimitKey,
} from '../../src/modules/auth/password-reset-rate-limit';

function request(body: Record<string, unknown>, ip = '203.0.113.10') {
  return {
    body,
    headers: {},
    ip,
    socket: { remoteAddress: ip },
  } as any;
}

describe('password reset rate-limit keys', () => {
  it('does not let attempts against an expired token block a newly issued token', () => {
    const expiredKey = passwordResetSubmissionRateLimitKey(request({ token: 'expired-token' }));
    const freshKey = passwordResetSubmissionRateLimitKey(request({ token: 'fresh-token' }));

    expect(expiredKey).not.toEqual(freshKey);
    expect(expiredKey).not.toContain('expired-token');
    expect(freshKey).not.toContain('fresh-token');
  });

  it('normalizes the email while keeping reset requests scoped by client', () => {
    const first = passwordResetRequestRateLimitKey(request({ email: ' Employee@Example.com ' }));
    const sameUser = passwordResetRequestRateLimitKey(request({ email: 'employee@example.com' }));
    const otherClient = passwordResetRequestRateLimitKey(request({ email: 'employee@example.com' }, '203.0.113.11'));

    expect(first).toEqual(sameUser);
    expect(first).not.toEqual(otherClient);
  });
});
