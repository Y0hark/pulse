export interface Env {
  // Deliberately typed against the standard Fetch API (already available via the DOM lib)
  // rather than @cloudflare/workers-types' Fetcher, which redeclares Request/Response/fetch
  // and conflicts with the DOM lib types the rest of this Vue app relies on.
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN: string;
}

// Same set of route prefixes the dev-time Vite proxy forwards to the local API
// (see vite.config.ts). Keeping the API on this Worker's own domain makes the
// session cookie first-party, so browsers that block third-party cookies still
// send it.
const API_PATH_PREFIXES = ['/auth', '/me', '/teams', '/missions', '/users'];

function isApiPath(pathname: string): boolean {
  return API_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (isApiPath(url.pathname)) {
      const target = new URL(url.pathname + url.search, env.API_ORIGIN);
      return fetch(new Request(target, request));
    }
    return env.ASSETS.fetch(request);
  },
};
