declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    VUE_APP_GITHUB_COMMIT_REF: string;
    PACKAGE_ID: string;
    USER_PROFILE_REGISTRY_ID: string;
    CHAT_ROOM_REGISTRY_ID: string;
  }
}
