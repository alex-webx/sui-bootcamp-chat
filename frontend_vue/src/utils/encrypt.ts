// Define o nome do algoritmo e a curva para ECDH
const ECDH_ALG_NAME = "ECDH";
const ECDH_CURVE = "P-256"; // Vamos usar P-256 (NIST standard) para compatibilidade ampla primeiro, depois podemos tentar Secp256k1 se necessário.

// A interface StoredEncryptedKey foi ligeiramente ajustada para refletir que os dados da chave pública são agora Uint8Array (para a Move) e a chave privada é um JWK criptografado.
export interface UserProfileKey {
  iv: Uint8Array;                 // Initialization Vector (GCM) - Uint8Array
  encryptedKey: Uint8Array;       // Chave privada EC criptografada (JWK format) - Uint8Array
  salt: Uint8Array;               // Salt usado para derivar a chave AES (PBKDF2) - Uint8Array
  publicKey: Uint8Array;          // Chave pública (opcional, se armazenada na blockchain) - Uint8Array
}

/**
 * Converte um ArrayBuffer (ou Uint8Array) para uma string Base64URL.
 */
function arrayBufferToBase64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converte uma string Base64URL de volta para um ArrayBuffer.
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray.buffer;
}

// --- Funções de Criptografia Simétrica (AES) e Derivação de Chave (PBKDF2) ---

/**
 * Gera uma chave simétrica aleatória usando a Web Crypto API.
 *
 * @param length O comprimento da chave em bits (ex: 128, 256).
 * @param extractable Define se a chave pode ser exportada do armazenamento de chaves (true/false).
 * @returns Uma Promise que resolve para um objeto CryptoKey.
 */
export const generateSymmetricKey = async (
  length: 128 | 256 = 256,
  extractable: boolean = true
): Promise<CryptoKey>  => {
  // Define o algoritmo a ser usado (AES-CBC é comum para simétricas)
  const algorithm: AesKeyGenParams = {
    name: "AES-CBC",
    length: length,
  };

  // Usa a API nativa para gerar a chave
  const key = await window.crypto.subtle.generateKey(
    algorithm,
    extractable, // Pode ser exportada/salva depois?
    ["encrypt", "decrypt"] // Usos permitidos para esta chave
  );

  return key;
};

/**
 * Exporta uma chave simétrica (CryptoKey) para um Uint8Array no formato "raw".
 * @param symmetricKey A chave simétrica (ex: AES-CBC) a ser exportada.
 * @returns Uma Promise que resolve para um Uint8Array.
 */
export async function exportSymmetricKeyAsUint8Array(symmetricKey: CryptoKey): Promise<Uint8Array> {
  // Use "raw" para chaves simétricas (AES)
  const rawBuffer = await window.crypto.subtle.exportKey("raw", symmetricKey);

  return new Uint8Array(rawBuffer);
}

/**
 * Deriva uma chave AES a partir de uma "senha" (assinatura mestra) E UM SALT ESPECÍFICO (ArrayBuffer).
 */
async function deriveAesKeyFromPassword(password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password), // A sua assinatura mestra funciona como a "senha"
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Criptografa a chave privada EC (JWK) usando AES-GCM.
 */
async function encryptPrivateKey(privateKey: CryptoKey, aesKey: CryptoKey): Promise<{iv: Uint8Array, encryptedKeyJwk: Uint8Array}> {
  const jwk = await exportPrivateKeyAsJwk(privateKey);
  const jwkString = JSON.stringify(jwk);
  const dataToEncrypt = new TextEncoder().encode(jwkString);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    dataToEncrypt
  );

  return {
    iv: iv, // Retorna Uint8Array
    encryptedKeyJwk: new Uint8Array(encryptedBuffer) // Retorna Uint8Array
  };
}

/**
 * Descriptografa a chave privada EC criptografada usando AES-GCM e a senha mestra.
 */
export async function decryptPrivateKey(encryptedData: UserProfileKey, masterPassword: string): Promise<CryptoKey> {
  // Use os Uint8Arrays diretamente, sem base64urlToArrayBuffer
  const aesKey = await deriveAesKeyFromPassword(masterPassword, encryptedData.salt.buffer as ArrayBuffer);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encryptedData.iv.buffer as BufferSource },
    aesKey,
    encryptedData.encryptedKey.buffer as ArrayBuffer
  );

  const decryptedJwkString = new TextDecoder().decode(decryptedBuffer);
  const decryptedJwk: JsonWebKey = JSON.parse(decryptedJwkString);

  const privateKey = await importPrivateKeyFromJwk(decryptedJwk);

  return privateKey;
}


/**
 * Gera um par de chaves ECDH (pública e privada) usando a Web Crypto API (P-256).
 */
async function generateEcKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: ECDH_ALG_NAME,
      namedCurve: ECDH_CURVE,
    },
    true, // Chaves extraíveis (para exportar para a Move ou localStorage)
    ['deriveKey', 'deriveBits'] // Ação principal do ECDH é derivar chaves compartilhadas
  );
}

/**
 * Exporta a chave privada ECDH para o formato JWK para armazenamento seguro local.
 */
async function exportPrivateKeyAsJwk(privateKey: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey("jwk", privateKey);
}

/**
 * Importa uma chave pública SPKI (Uint8Array) de volta para um objeto CryptoKey usável.
 */
async function importPublicKeyFromUint8Array(publicKeyBytes: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "spki",
    publicKeyBytes.buffer as BufferSource,
    { name: ECDH_ALG_NAME, namedCurve: ECDH_CURVE },
    true,
    [] // A chave pública ECDH não "criptografa" nada diretamente, ela deriva
  );
}

/**
 * Importa uma chave privada JWK (depois de descriptografada localmente) de volta para um objeto CryptoKey usável.
 */
async function importPrivateKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: ECDH_ALG_NAME, namedCurve: ECDH_CURVE },
    true,
    ['deriveKey', 'deriveBits']
  );
}


// /**
//  * Deriva a chave simétrica AES compartilhada usando ECDH.
//  *
//  * @param privateKey O objeto CryptoKey da sua chave privada (já carregada/desembrulhada).
//  * @param publicKeyBytes O Uint8Array da chave pública da outra pessoa (buscado da Move).
//  * @returns A chave simétrica AES (CryptoKey) para encrypt/decrypt mensagens.
//  */
// async function deriveSharedAesKey(privateKey: CryptoKey, publicKeyBytes: Uint8Array): Promise<CryptoKey> {

//   // Importa a chave pública da outra pessoa a partir dos bytes SPKI
//   const otherPublicKey = await importPublicKeyFromUint8Array(publicKeyBytes);

//   // Derivação Mágica do ECDH:
//   const sharedSecret = await window.crypto.subtle.deriveBits(
//     {
//         name: ECDH_ALG_NAME,
//         public: otherPublicKey
//     },
//     privateKey, // Usa sua chave privada
//     256 // Tamanho da chave AES desejada (256 bits)
//   );

//   // Importa o segredo compartilhado como uma chave AES-GCM usável
//   return window.crypto.subtle.importKey(
//     "raw",
//     sharedSecret,
//     { name: "AES-GCM", length: 256 },
//     true,
//     ["encrypt", "decrypt"]
//   );
// }

/**
 * Criptografa uma mensagem (string ou Uint8Array) usando uma chave AES-GCM (CryptoKey).
 * O IV é gerado automaticamente e incluído no resultado (formato Base64Url combinado).
 *
 * @param dataToEncrypt Os dados a serem criptografados (texto simples ou bytes brutos).
 * @param aesKey A chave AES (CryptoKey) derivada via ECDH.
 * @returns O texto cifrado e o IV combinados em uma string Base64Url.
 */
export async function encryptMessageAesGcm(dataToEncrypt: string | Uint8Array, aesKey: CryptoKey): Promise<string> {

    // 1. Preparar os dados como Uint8Array
    const dataBuffer = typeof dataToEncrypt === 'string'
        ? new TextEncoder().encode(dataToEncrypt)
        : dataToEncrypt;

    // 2. Gerar um IV aleatório (12 bytes é padrão para AES-GCM)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Criptografar
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        dataBuffer.buffer as BufferSource // Usa assertion para compatibilidade
    );

    // 4. Combinar IV e Texto Cifrado para transmissão (IV precisa ser enviado junto)
    const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combinedBuffer.set(iv);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

    // Retorna o resultado combinado como string Base64Url (fácil para mover/armazenar)
    return arrayBufferToBase64Url(combinedBuffer);
}

/**
 * Descriptografar mensagens enviadas
 * Descriptografa uma mensagem combinada (IV+Texto Cifrado em Base64Url) usando uma chave AES-GCM.
 *
 * @param combinedCiphertextBase64Url O texto cifrado combinado.
 * @param aesKey A chave AES (CryptoKey) derivada via ECDH.
 * @returns Os bytes descriptografados (Uint8Array).
 */
export async function decryptMessageAesGcm(combinedCiphertextBase64Url: string, aesKey: CryptoKey): Promise<Uint8Array> {

    const combinedBuffer = base64UrlToArrayBuffer(combinedCiphertextBase64Url);
    const ivLength = 12; // 12 bytes de IV usados na criptografia

    // 1. Separar o IV e o Texto Cifrado
    const iv = combinedBuffer.slice(0, ivLength);
    const ciphertext = combinedBuffer.slice(ivLength);

    // 2. Descriptografar
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        ciphertext
    );

    return new Uint8Array(decryptedBuffer);
}


/**
 * Criação de UserProfile
 * Orquestra a geração de um par de chaves ECDH e o "embrulho" da chave privada
 * usando uma assinatura mestra da carteira. Retorna o objeto para armazenamento local e Move.
 */
export const generateKeysWithSignature = async (masterSignature: string): Promise<UserProfileKey> => {
  // gera par assimétrica de chaves ECDH
  const ecdhPair = await generateEcKeyPair();

  // criptografia da chave privada para armazenamento na blockchain, derivando uma chave AES da assinatura da carteira que será utilizada para criptografar a private key
  const saltArray = window.crypto.getRandomValues(new Uint8Array(16));
  const aesKeyForWrapping = await deriveAesKeyFromPassword(masterSignature, saltArray.buffer as ArrayBuffer);
  const encryptedData = await encryptPrivateKey(ecdhPair.privateKey, aesKeyForWrapping);

  // serialização da public key em bytes
  const publicKeyForBlockchain = await async function() {
    const spkiBuffer = await window.crypto.subtle.exportKey("spki", ecdhPair.publicKey);
    return new Uint8Array(spkiBuffer);
  }();

  const storedObject: UserProfileKey = {
    iv: encryptedData.iv, // Uint8Array
    salt: saltArray, // Uint8Array
    publicKey: publicKeyForBlockchain, // Uint8Array
    encryptedKey: encryptedData.encryptedKeyJwk, // Uint8Array
  };

  return storedObject;
};


export default {
  // arrayBufferToBase64Url,
  // base64UrlToArrayBuffer,
  // deriveAesKeyFromPassword,
  // encryptPrivateKey,
  // decryptPrivateKey,
  // generateSymmetricKey,
  // generateEcKeyPair,
  // exportPublicKeyAsUint8Array,
  // exportPrivateKeyAsJwk,
  // importPublicKeyFromUint8Array,
  // importPrivateKeyFromJwk,
  // deriveSharedAesKey,
  encryptMessageAesGcm,
  decryptMessageAesGcm,
  generateKeysWithSignature
};
