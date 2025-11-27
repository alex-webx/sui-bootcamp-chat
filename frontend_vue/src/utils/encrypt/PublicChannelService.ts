import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './utils';

export class PublicChannelService {

  // A chave agora é um campo privado que pode ser nulo inicialmente
  private obfuscationKey: CryptoKey | null = null;
  private readonly creatorAddress: string;

  /**
   * Construtor que armazena o endereço do criador.
   * @param creatorAddress O endereço Sui (0x...) do criador da sala.
   */
  constructor(creatorAddress: string) {
    this.creatorAddress = creatorAddress;
  }

  /**
   * Garante que a chave de ofuscação esteja derivada e pronta para uso.
   * Se já estiver derivada, retorna imediatamente.
   */
  private async ensureKeyIsReady(): Promise<void> {
    if (!this.obfuscationKey) {
      console.log("Chave de ofuscação não encontrada em memória, derivando automaticamente...");
      const encoder = new TextEncoder();
      const data = encoder.encode(this.creatorAddress);

      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);

      this.obfuscationKey = await window.crypto.subtle.importKey(
        "raw",
        hashBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }
  }

  /**
   * Criptografa uma mensagem para um canal público.
   */
  public async encryptMessage(plaintext: string): Promise<{iv: string, ciphertext: string}> {
    // Garante que a chave esteja pronta antes de prosseguir
    await this.ensureKeyIsReady();

    // Agora podemos usar this.obfuscationKey com segurança, pois ensureKeyIsReady garante que não é nulo
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer },
      this.obfuscationKey!, // Usamos '!' (non-null assertion) pois garantimos a existência logo acima
      data
    );

    return {
      iv: arrayBufferToBase64Url(iv),
      ciphertext: arrayBufferToBase64Url(encryptedBuffer)
    };
  }

  /**
   * Descriptografa uma mensagem ofuscada em um canal público.
   */
  public async decryptMessage(args: { iv: string, ciphertext: string }): Promise<string> {
    // Garante que a chave esteja pronta antes de prosseguir
    await this.ensureKeyIsReady();

    const ciphertextBuffer = base64UrlToArrayBuffer(args.ciphertext);
    const ivBuffer = base64UrlToArrayBuffer(args.iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      this.obfuscationKey!, // Usamos '!' (non-null assertion) pois garantimos a existência logo acima
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

}
