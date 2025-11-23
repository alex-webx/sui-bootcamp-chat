export interface UserProfileData {
  publicKeySpki: Uint8Array;       // Chave pública (Formato SPKI)
  privateKeyWrapped: Uint8Array;   // Chave privada embrulhada (Ciphertext AES)
  salt: Uint8Array;                // Salt usado no PBKDF2
  iv: Uint8Array;                  // IV usado no AES-GCM wrapping
}
