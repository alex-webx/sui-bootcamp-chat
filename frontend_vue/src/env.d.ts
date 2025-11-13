declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    VUE_APP_GITHUB_COMMIT_REF: string;
    COMMIT_REF: string | undefined; //injected by Netlify
  }
}
