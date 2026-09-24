import type { SupabaseClient, User, Session, AuthResponse } from '@supabase/supabase-js';

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: {
      url: string;
      anonKey: string;
    };
  }
}

const SUPABASE_CONFIG_READY_EVENT = 'supabase-config-ready';

const MOCK_USER: User = {
  id: 'local-dev-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@local.dev',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmation_sent_at: undefined,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'local', providers: ['local'] },
  user_metadata: { name: 'Local Admin' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as User;

const MOCK_SESSION: Session = {
  access_token: 'local-dev-token',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 365,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
  refresh_token: 'local-dev-refresh',
  user: MOCK_USER,
} as Session;

function createMockClient(): SupabaseClient {
  const mockAuth = {
    getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
    getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
    signInWithPassword: async (_args: { email: string; password: string }) => ({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null,
    }) as AuthResponse,
    signUp: async (_args: { email: string; password: string }) => ({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null,
    }) as AuthResponse,
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: null }),
    onAuthStateChange: (_callback: (event: string, session: Session | null) => void) => ({
      subscription: { unsubscribe: () => {} },
    }),
    getOAuthSignInUrl: async () => ({ data: { url: '' }, error: null }),
  };

  return {
    auth: mockAuth,
    from: () => {
      throw new Error('Browser client: use API routes for data access');
    },
    rpc: () => {
      throw new Error('Browser client: rpc not available in local mode');
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Local mode: storage disabled') }),
        download: async () => ({ data: null, error: new Error('Local mode: storage disabled') }),
        list: async () => ({ data: null, error: new Error('Local mode: storage disabled') }),
        remove: async () => ({ data: null, error: new Error('Local mode: storage disabled') }),
        createSignedUrl: async () => ({ data: null, error: new Error('Local mode: storage disabled') }),
      }),
    },
    channel: () => {
      throw new Error('Local mode: realtime disabled');
    },
    removeChannel: () => {},
    getChannels: () => [],
    on: () => {
      throw new Error('Local mode: realtime disabled');
    },
    stop: () => {},
    headers: {},
    url: 'local://expert_qa',
    key: 'local-dev',
    schema: 'public',
    rest: {
      get: async () => ({ data: null, error: new Error('Not available') }),
      post: async () => ({ data: null, error: new Error('Not available') }),
      put: async () => ({ data: null, error: new Error('Not available') }),
      patch: async () => ({ data: null, error: new Error('Not available') }),
      delete: async () => ({ data: null, error: new Error('Not available') }),
    },
  } as unknown as SupabaseClient;
}

let browserClient: SupabaseClient | null = null;

function waitForConfig(maxWait = 5000): Promise<boolean> {
  if (window.__SUPABASE_CONFIG__?.url && window.__SUPABASE_CONFIG__?.anonKey) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const handler = () => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener(SUPABASE_CONFIG_READY_EVENT, handler);
        resolve(true);
      }
    };
    window.addEventListener(SUPABASE_CONFIG_READY_EVENT, handler);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener(SUPABASE_CONFIG_READY_EVENT, handler);
        resolve(true);
      }
    }, maxWait);
  });
}

function isConfigReady(): boolean {
  return !!window.__SUPABASE_CONFIG__;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient === null) {
    browserClient = createMockClient();
  }
  return browserClient;
}

async function getSupabaseBrowserClientWithRetry(maxRetries = 5, retryInterval = 1000): Promise<SupabaseClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return getSupabaseBrowserClient();
    } catch {
      if (i < maxRetries - 1) {
        await sleep(retryInterval);
      }
    }
  }
  return getSupabaseBrowserClient();
}

async function getSupabaseBrowserClientAsync(): Promise<SupabaseClient> {
  if (browserClient !== null) {
    return browserClient;
  }
  await waitForConfig();
  return getSupabaseBrowserClient();
}

export { getSupabaseBrowserClient, getSupabaseBrowserClientWithRetry, getSupabaseBrowserClientAsync, waitForConfig, isConfigReady };