import { UserProfileData } from './UserProfileData';

export class UserProfileGenerator {

  /**
   * Gera todos os dados de chave necessários para um novo perfil de usuário.
   *
   * @param masterPassword O material da senha mestra (e.g., assinatura da carteira Sui em string Base64URL).
   * @returns {Promise<UserProfileData>} Um objeto contendo todos os dados prontos para armazenamento na blockchain.
   */
  public async generateProfileKeys(masterPassword: string): Promise<UserProfileData> {
    // 1. Gerar o par de chaves ECDH
    const keyPair = await this.generateEcdhKeyPair();

    // 2. Gerar Salt e IV aleatórios para o wrapping
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Derivar a chave AES do wrapper a partir da senha mestra e do salt
    const wrappingAesKey = await UserProfileGenerator.deriveAesKeyFromPassword(masterPassword, salt.buffer);

    // 4. Empacotar (wrap/criptografar) a chave privada ECDH usando a chave AES do wrapper
    const wrappedPrivateKey = await this.wrapEcdhPrivateKey(keyPair.privateKey, wrappingAesKey, iv);

    // 5. Exportar a chave pública para o formato binário (SPKI)
    const publicKeySpki = await this.exportEcdhPublicKey(keyPair.publicKey);

    return {
      publicKeySpki: new Uint8Array(publicKeySpki),
      privateKeyWrapped: new Uint8Array(wrappedPrivateKey),
      salt: salt,
      iv: iv,
    };
  }

  // --- Métodos Privados Auxiliares ---

  private async generateEcdhKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
  }

  private async exportEcdhPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
    return window.crypto.subtle.exportKey("spki", publicKey);
  }

  public static async deriveAesKeyFromPassword(password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false, // Não extraível, apenas para uso interno no wrapper
      ["wrapKey", "unwrapKey"]
    );
  }

  /**
   * Empacota a chave privada ECDH exportando-a para JWK e criptografando com AES-GCM.
   */
  private async wrapEcdhPrivateKey(privateKeyEcdh: CryptoKey, aesKeyWrapper: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
      // Exportamos para JWK para manter o formato consistente
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKeyEcdh);

    // Convertemos o objeto JWK para ArrayBuffer para a operação de wrapping
    const jwkString = JSON.stringify(jwk);
    const dataToWrap = new TextEncoder().encode(jwkString); // Isso é incorreto para wrapKey, wrapKey espera uma CryptoKey de entrada

    // wrapKey espera uma CryptoKey como primeiro argumento!
    // return window.crypto.subtle.wrapKey(format, keyToBeWrapped, wrappingKey, wrapAlgorithm)

    return window.crypto.subtle.wrapKey(
      "jwk", // Formato de saída da chave embrulhada (a string JWK será o resultado)
      privateKeyEcdh, // A chave que queremos embrulhar
      aesKeyWrapper, // A chave wrapper (que tem uso 'wrapKey')
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer } // Algoritmo do wrapper
    );
  }
}
