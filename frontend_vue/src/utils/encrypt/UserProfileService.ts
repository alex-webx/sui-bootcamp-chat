import { UserProfileData } from './UserProfileData';
import { UserProfileGenerator } from './UserProfileGenerator';

export class UserProfileService {
  /**
   * Desembrulha (descriptografa) a chave privada de um perfil de usuário recuperado da blockchain.
   *
   * @param profileData Os dados do perfil recuperados da blockchain (Uint8Arrays).
   * @param masterPassword A senha mestra (e.g., assinatura da carteira Sui em string Base64URL).
   * @returns {Promise<CryptoKey>} A chave privada ECDH original, pronta para uso no navegador.
   */
  public async unwrapPrivateKey(profileData: UserProfileData, masterPassword: string): Promise<CryptoKey> {

    // 1. Derivar a mesma chave AES do wrapper a partir da senha mestra e do salt armazenado
    const wrappingAesKey = await this.deriveAesKeyFromPassword(masterPassword, profileData.salt.buffer as ArrayBuffer);

    // 2. Desembrulhar (decrypt/unwrap) a chave privada embrulhada
    const privateKey = await this.unwrapEcdhPrivateKey(profileData.privateKeyWrapped.buffer as ArrayBuffer, wrappingAesKey, profileData.iv.buffer as ArrayBuffer);

    return privateKey;
  }

  // --- Métodos Privados Auxiliares de Criptografia ---

  private async deriveAesKeyFromPassword(password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"] // Precisamos do uso 'decrypt' aqui para o unwrap
    );
  }

  /**
   * Desembrulha (descriptografa) os bytes JWK e importa de volta para uma CryptoKey ECDH.
   */
  private async unwrapEcdhPrivateKey(wrappedKeyBuffer: ArrayBuffer, aesKeyWrapper: CryptoKey, ivBuffer: ArrayBuffer): Promise<CryptoKey> {

    // 1. Descriptografar o ArrayBuffer JWK usando AES-GCM
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKeyWrapper,
      wrappedKeyBuffer
    );

    // 2. Converter o resultado (String JSON JWK) de volta para um objeto JsonWebKey
    const decryptedJwkString = new TextDecoder().decode(decryptedBuffer);
    const decryptedJwk: JsonWebKey = JSON.parse(decryptedJwkString);

    // 3. Importar o objeto JWK para uma CryptoKey utilizável no navegador
    return window.crypto.subtle.importKey(
      "jwk",
      decryptedJwk,
      { name: "ECDH", namedCurve: "P-256" }, // Algoritmo original
      true, // Pode ser extraída (necessário para o processo de wrapping/unwrapping)
      ["deriveKey"] // Usos permitidos para a chave privada
    );
  }
}
