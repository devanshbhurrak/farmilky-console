interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  BACKEND: Fetcher;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: Record<string, unknown>;
}

// The SPA talks to the backend through the Worker's service binding, so the
// browser only ever sees this origin (no CORS, no public API hostname).
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return env.BACKEND.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
