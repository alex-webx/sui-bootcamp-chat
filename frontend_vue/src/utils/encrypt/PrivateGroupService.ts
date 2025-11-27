import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './utils';

export interface WrappedRoomKeyData {
  encodedAesKey: Uint8Array;     // A chave AES da sala, embrulhada (Base64URL)
  iv: Uint8Array;             // O IV usado para este embrulho específico (Base64URL)
  inviterPublicKey: Uint8Array; // A chave pública ECDH (SPKI Base64URL) de quem convidou
}

export class PrivateGroupService {

  // ----------------------------------------------------------------------
  // NOVOS MÉTODOS ESTÁTICOS PARA CRIAÇÃO E CONVITE DE SALA
  // ----------------------------------------------------------------------

  /**
   * [FLUXO 1] Gera uma nova chave mestra AES-256 para a sala (somente o criador executa isso UMA vez).
   * @returns O material bruto da chave AES como Uint8Array (32 bytes).
   */
  public static async generateRoomKeyMaterial(): Promise<Uint8Array> {
    return window.crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * [FLUXO 2] Cria o objeto WrappedRoomKeyData para um destinatário específico (incluindo o próprio criador).
   * Este objeto é o que deve ser salvo na Blockchain.
   *
   * @param roomAesKeyMaterial O material bruto da chave mestra da sala (Uint8Array de 32 bytes).
   * @param inviterPrivateKey A chave privada ECDH (CryptoKey) de quem está convidando (criador/admin).
   * @param recipientPublicKeySpkiBuffer A chave pública SPKI do destinatário (ArrayBuffer ou Uint8Array.buffer).
   * @returns O objeto WrappedRoomKeyData pronto para ser armazenado na Blockchain.
   */
  public static async generateInvitationKey(
    roomAesKeyMaterial: Uint8Array,
    inviterPrivateKey: CryptoKey,
    inviterPublicKeySpki: Uint8Array,
    recipientPublicKeySpkiBuffer: Uint8Array
  ): Promise<WrappedRoomKeyData> {

    // 1. Importar a chave pública do destinatário (SPKI -> CryptoKey)
    const recipientPublicKey = await window.crypto.subtle.importKey(
        "spki",
        recipientPublicKeySpkiBuffer.buffer as ArrayBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        [] // Chaves públicas não são usadas para encrypt/decrypt diretamente, apenas para deriveKey
    );

    // 2. Derivar o segredo compartilhado (InviterPrivate + RecipientPublic)
    const sharedSecretKeyWrapper = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: recipientPublicKey },
        inviterPrivateKey,
        { name: "AES-GCM", length: 256 }, // Usamos AES-GCM para embrulhar/desembrulhar
        false,
        ["encrypt", "decrypt"] // Precisamos usar esta chave para embrulhar (encrypt)
    );

    // 3. Alice embrulha a chave mestra da sala usando o segredo compartilhado
    const ivWrap = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedRoomKeyBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivWrap }, // Passa o Uint8Array do IV diretamente
        sharedSecretKeyWrapper,
        roomAesKeyMaterial.buffer as ArrayBuffer // O material bruto da chave AES da sala (Uint8Array)
    );

    // 4. Retorna o objeto que será armazenado na blockchain
    return {
        encodedAesKey: new Uint8Array(wrappedRoomKeyBuffer),
        iv: ivWrap,
        // A chave pública do criador precisa ser incluída para que o destinatário saiba
        // com quem derivar o segredo compartilhado durante o desembrulho (initialize)
        inviterPublicKey: inviterPublicKeySpki, // Assumindo que a chave pública está acessível aqui ou passada como parâmetro
    };
  }

  // ----------------------------------------------------------------------
  // MÉTODOS DE INSTÂNCIA (USO APÓS A INICIALIZAÇÃO/DESEMBRULHO)
  // ----------------------------------------------------------------------

  private roomAesKey: CryptoKey | null = null;
  private inviterPublicKeyBytes: Uint8Array | null = null;

  public async exportRoomAesKey () {
    await this.initialize();
    if (this.roomAesKey) {
      const keyBuffer = await crypto.subtle.exportKey(
        'raw',
        this.roomAesKey
      );
      return new Uint8Array(keyBuffer);
    }
  }

  /**
   * @param wrappedRoomKeyData Os dados do objeto mapeado na Blockchain.
   * @param userPrivateKeyLocal Chave privada ECDH do usuário local (como CryptoKey).
   */
  public constructor(private wrappedRoomKeyData: WrappedRoomKeyData, private userPrivateKeyLocal: CryptoKey) {
  }

  /**
   * Inicializa o serviço, desembrulhando a chave mestra da sala.
   */
  private async initialize(): Promise<void> {
    this.inviterPublicKeyBytes = this.wrappedRoomKeyData.inviterPublicKey;

    // Desembrulha a chave da sala (AES) usando ECDH
    this.roomAesKey = await this.unwrapRoomKey(
      this.wrappedRoomKeyData.encodedAesKey,
      this.wrappedRoomKeyData.iv,
      this.wrappedRoomKeyData.inviterPublicKey,
      this.userPrivateKeyLocal
    );
  }

  // --- Métodos de Mensagens (Usam a chave mestra da sala para I/O string/string) ---
  public async encryptMessage(plaintext: string): Promise<{iv: string, ciphertext: string}> {
    await this.initialize();

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv }, // Passando Uint8Array diretamente
      this.roomAesKey!,
      new TextEncoder().encode(plaintext)
    );

    return {
      iv: arrayBufferToBase64Url(iv),
      ciphertext: arrayBufferToBase64Url(encryptedBuffer)
    };
  }

  public async decryptMessage(args: { iv: string, ciphertext: string }): Promise<string> {
    await this.initialize();

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToArrayBuffer(args.iv) },
      this.roomAesKey!,
      base64UrlToArrayBuffer(args.ciphertext)
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  // ----------------------------------------------------------------------
  // MÉTODOS PRIVADOS AUXILIARES (EXISTENTES, AJUSTADOS PARA TIPOS MODERNOS)
  // ----------------------------------------------------------------------

  private async unwrapRoomKey(
    wrappedKey: Uint8Array,
    iv: Uint8Array,
    inviterPubKey: Uint8Array,
    userPrivateKeyLocal: CryptoKey
  ): Promise<CryptoKey> {
    // 1. Importar a chave pública de quem convidou
    const inviterPublicKey = await this.importEcdhPublicKey(inviterPubKey);

    // 2. Derivar a CHAVE SECRETA COMPARTILHADA (AQUI A MÁGICA ECDH ACONTECE)
    const sharedSecretECDH = await this.deriveSharedAesKey(userPrivateKeyLocal, inviterPublicKey);

    // 3. Descriptografar o objeto da chave mestra da sala usando a chave compartilhada
    const roomKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, // Passando Uint8Array
      sharedSecretECDH,
      wrappedKey.buffer as ArrayBuffer // Passando Uint8Array
    );

    // 4. Importar o material bruto da chave AES da sala (256 bits) para uma CryptoKey utilizável
    return window.crypto.subtle.importKey(
      "raw",
      roomKeyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  private async importEcdhPublicKey(publicKeyBuffer: Uint8Array): Promise<CryptoKey> {
    return window.crypto.subtle.importKey("spki", publicKeyBuffer.buffer as ArrayBuffer, { name: "ECDH", namedCurve: "P-256" }, true, []);
  }

  private async deriveSharedAesKey(privateKeyLocal: CryptoKey, publicKeyRemote: CryptoKey): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
      { name: "ECDH", public: publicKeyRemote },
      privateKeyLocal,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
}
