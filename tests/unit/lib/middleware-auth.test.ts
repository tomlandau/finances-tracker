import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { withAuth } from '../../../lib/middleware-auth';

const JWT_SECRET = process.env.JWT_SECRET!;

const makeReq = (token?: string) =>
  ({
    headers: {
      cookie: token ? `accessToken=${token}` : '',
    },
  }) as any;

const makeRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as any;
};

describe('middleware-auth - withAuth', () => {
  it('B14.1 - no token returns 401', async () => {
    const req = makeReq();
    const res = makeRes();
    const handler = vi.fn();

    await withAuth(handler)(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('B14.2 - valid token calls handler with req.user', async () => {
    const token = jwt.sign({ userId: 'usr_tom_001', username: 'tom' }, JWT_SECRET);
    const req = makeReq(token);
    const res = makeRes();
    const handler = vi.fn().mockResolvedValue(undefined);

    await withAuth(handler)(req, res);

    expect(handler).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 'usr_tom_001', username: 'tom' });
  });

  it('B14.3 - expired token returns 401 with TOKEN_EXPIRED code', async () => {
    // Create token with exp in the past
    const token = jwt.sign(
      { userId: 'usr_tom_001', username: 'tom', exp: Math.floor(Date.now() / 1000) - 3600 },
      JWT_SECRET
    );
    const req = makeReq(token);
    const res = makeRes();
    const handler = vi.fn();

    await withAuth(handler)(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('B14.4 - invalid/forged token returns 403 with INVALID_TOKEN code', async () => {
    const token = 'invalid.jwt.token';
    const req = makeReq(token);
    const res = makeRes();
    const handler = vi.fn();

    await withAuth(handler)(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    expect(handler).not.toHaveBeenCalled();
  });
});
