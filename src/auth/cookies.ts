import type { IncomingMessage, ServerResponse } from 'node:http';

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export interface SetCookieOptions {
  maxAgeSeconds?: number;
  secure: boolean;
  /** Frontend and API are on different origins in production (Cloudflare Pages + Render),
   * so the session cookie needs SameSite=None to be sent on cross-site fetches. Browsers
   * require Secure whenever SameSite=None is set. */
  crossSite?: boolean;
}

export function setCookie(res: ServerResponse, name: string, value: string, opts: SetCookieOptions): void {
  const sameSite = opts.crossSite ? 'SameSite=None' : 'SameSite=Lax';
  const parts = [`${name}=${encodeURIComponent(value)}`, 'HttpOnly', 'Path=/', sameSite];
  if (opts.secure || opts.crossSite) parts.push('Secure');
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  appendSetCookie(res, parts.join('; '));
}

export function clearCookie(res: ServerResponse, name: string, opts: { secure: boolean; crossSite?: boolean }): void {
  const sameSite = opts.crossSite ? 'SameSite=None' : 'SameSite=Lax';
  const parts = [`${name}=`, 'HttpOnly', 'Path=/', sameSite, 'Max-Age=0'];
  if (opts.secure || opts.crossSite) parts.push('Secure');
  appendSetCookie(res, parts.join('; '));
}

function appendSetCookie(res: ServerResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookie]);
  }
}
