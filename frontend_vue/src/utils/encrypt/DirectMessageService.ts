import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './utils';

export class DirectMessageService {

  public localPrivateKey: CryptoKey;
  public remotePublicKeyBuffer: Uint8Array;

  public sharedAesKey: CryptoKey | undefined;
  public remotePublicKey: CryptoKey | undefined;

  constructor(localPrivateKey: CryptoKey, remotePublicKey: Uint8Array) {
    this.localPrivateKey = localPrivateKey;
    this.remotePublicKeyBuffer = remotePublicKey;
  }

  private async ensureKeys() {
    if (!this.remotePublicKey) {
      // 1. Importar a chave pública do destinatário (do Uint8Array para CryptoKey)
      this.remotePublicKey = await this.importEcdhPublicKey(this.remotePublicKeyBuffer.buffer! as ArrayBuffer);

      // 2. Derivar a chave AES compartilhada via ECDH
      this.sharedAesKey = await this.deriveSharedAesKey(this.localPrivateKey, this.remotePublicKey);
    }
  }

  /**
   * Criptografa uma mensagem usando a chave privada local do remetente e a chave pública do destinatário.
   * Implementa o fluxo 3.1.2: A_priv + B_pub -> Chave AES -> Cripto da mensagem.
   *
   * @param plaintext A mensagem de texto simples.
   * @param senderPrivateKey A chave privada ECDH local do remetente (como CryptoKey).
   * @param recipientPublicKeyBytes A chave pública ECDH do destinatário (como Uint8Array SPKI).
   * @returns {Promise<{iv: string, ciphertext: string}>} Dados criptografados prontos para a blockchain.
   */
  public async encryptMessage(plaintext: string): Promise<{iv: string, ciphertext: string}> {
    await this.ensureKeys();
    // 3. Criptografar a mensagem usando a chave AES compartilhada
    return this.encryptMessageWithAesKey(plaintext, this.sharedAesKey!);
  }

  /**
   * Descriptografa uma mensagem usando a chave privada local do destinatário e a chave pública do remetente.
   * Implementa o fluxo 3.1.3: B_priv + A_pub -> Chave AES -> Descripto da mensagem.
   *
   * @param iv Base64URL do Initialization Vector.
   * @param ciphertext Base64URL da mensagem cifrada.
   * @param recipientPrivateKey A chave privada ECDH local do destinatário (como CryptoKey).
   * @param senderPublicKeyBytes A chave pública ECDH do remetente (como Uint8Array SPKI).
   * @returns {Promise<string>} A mensagem original em texto simples.
   */
  public async decryptMessage(args: { iv: string, ciphertext: string, }): Promise<string> {
    await this.ensureKeys();

    // 3. Descriptografar a mensagem usando a chave AES compartilhada
    return this.decryptMessageWithAesKey(args.ciphertext, args.iv, this.sharedAesKey!);
  }

  // --- Métodos Privados Auxiliares ---

  private async importEcdhPublicKey(publicKeyBuffer: ArrayBuffer): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  }

  private async deriveSharedAesKey(privateKeyLocal: CryptoKey, publicKeyRemote: CryptoKey): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
      { name: "ECDH", public: publicKeyRemote },
      privateKeyLocal,
      { name: "AES-GCM", length: 256 },
      false, // Não precisa ser extraível, só usada para essa mensagem
      ["encrypt", "decrypt"]
    );
  }

  // Obs: As funções AES-GCM encryptMessageWithAesKey e decryptMessageWithAesKey
  // podem ser movidas para uma classe utilitária de Criptografia Simétrica se
  // você quiser reutilizá-las no item 3.2 e 3.3.

  private async encryptMessageWithAesKey(plaintext: string, aesKey: CryptoKey): Promise<{iv: string, ciphertext: string}> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer }, // Use .buffer aqui para compatibilidade de tipo
      aesKey,
      data
    );

    return {
      iv: arrayBufferToBase64Url(iv),
      ciphertext: arrayBufferToBase64Url(encryptedBuffer)
    };
  }

  private async decryptMessageWithAesKey(ciphertextBase64Url: string, ivBase64Url: string, aesKey: CryptoKey): Promise<string> {
    const ciphertextBuffer = base64UrlToArrayBuffer(ciphertextBase64Url);
    const ivBuffer = base64UrlToArrayBuffer(ivBase64Url);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}
