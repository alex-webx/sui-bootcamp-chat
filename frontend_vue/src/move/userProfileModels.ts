// type helpers para extrair apenas as propriedades de uma classe (ignora getters e métodos)
type Properties<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K; }[keyof T]>;

export type UserProfile = {
  id: string;
  owner: string;
  username: string;
  avatarUrl: string;
  updatedAt: number;
  createdAt: number;
  roomsJoined: string[];
  keyPub: Uint8Array;
  keyPrivDerived: Uint8Array;
  keyIv: Uint8Array;
  keySalt: Uint8Array;
  keyPrivDecoded?: CryptoKey;
}
