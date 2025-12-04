declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    COMMIT_REF: string | undefined; //injected by Netlify
    NETWORK_DEFAULT_ENVIRONMENT: string | undefined; //injected by Netlify
    TEST_WALLETS: string | undefined;
  }
}
