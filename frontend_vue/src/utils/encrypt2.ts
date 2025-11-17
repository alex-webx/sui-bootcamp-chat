/**
 * Converte um ArrayBuffer (ou Uint8Array) para uma string Base64URL.
 * Essencial para serializar dados binários para transmissão (e.g., para a Sui Blockchain).
 */
export function arrayBufferToBase64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  // Usa btoa para Base64 padrão e depois ajusta para URL-safe
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converte uma string Base64URL de volta para um ArrayBuffer.
 * Essencial para desserializar dados binários recuperados da Sui.
 */
export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Ajusta de URL-safe de volta para Base64 padrão para atob funcionar
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray.buffer;
}


// Exemplo da interface de dados que a função retornará:
export interface UserProfileData {
    publicKeySpki: Uint8Array;       // Chave pública (Formato SPKI)
    privateKeyWrapped: Uint8Array;   // Chave privada embrulhada (Ciphertext AES)
    salt: Uint8Array;                // Salt usado no PBKDF2
    iv: Uint8Array;                  // IV usado no AES-GCM wrapping
}

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

    public static async example() {
      // Simulação da Master Password (assinatura da carteira Sui)
      const masterPass = "AIZ8UKhTlnJFQi293Naq4Dt+/k4KM51Wh8np4i2LJf62LZDA3A/wKIpunNsZ4EKGtGoQzFMImt+d8XPGT1Zq9ADIJa2I1zvCiRC06cyZckqM9mEVHveex2+5a3sSThbV7Q==";

      const generator = new UserProfileGenerator();
      const profileData = await generator.generateProfileKeys(masterPass);

      console.log("Dados do perfil gerados, prontos para a Blockchain Sui:");
      console.log("Chave Pública (Uint8Array):", profileData.publicKeySpki);
      console.log("Chave Privada Embrulhada (Uint8Array):", profileData.privateKeyWrapped);
      console.log("Salt (Uint8Array):", profileData.salt);
      console.log("IV (Uint8Array):", profileData.iv);

      // Estes Uint8Arrays seriam convertidos para Base64URL antes de enviar para o Contrato Move (vector<u8> na Sui)
    }
}

// Importe a interface UserProfileData e as funções auxiliares de Base64 se necessário
// (arrayBufferToBase64Url, base64UrlToArrayBuffer).

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

    public static async example () {
      // Simulação da Master Password (assinatura da carteira Sui)
      const masterPass = "AIZ8UKhTlnJFQi293Naq4Dt+/k4KM51Wh8np4i2LJf62LZDA3A/wKIpunNsZ4EKGtGoQzFMImt+d8XPGT1Zq9ADIJa2I1zvCiRC06cyZckqM9mEVHveex2+5a3sSThbV7Q==";

      // --- FASE 1: Geração e Envio para Blockchain (Usando UserProfileGenerator) ---
      const generator = new UserProfileGenerator();
      const profileData = await generator.generateProfileKeys(masterPass);
      console.log("Dados do perfil gerados, prontos para a Blockchain Sui:", profileData);
      // [Aqui você enviaria profileData para a Sui]


      // --- FASE 2: Recuperação e Uso (Usando UserProfileService) ---
      // Simulação de que recuperamos 'profileData' da Sui
      const service = new UserProfileService();

      console.log("\nTentando recuperar a chave privada a partir dos dados da Blockchain...");
      const recoveredPrivateKey = await service.unwrapPrivateKey(profileData, masterPass);

      console.log("SUCESSO: Chave privada recuperada como CryptoKey:", recoveredPrivateKey);

      // Agora 'recoveredPrivateKey' pode ser usada na classe DirectMessageService para derivar chaves compartilhadas!
    }
}


// Importe ou defina aqui as funções auxiliares de codificação/decodificação
// (arrayBufferToBase64Url, base64UrlToArrayBuffer) do nosso código anterior, se estiverem em arquivos separados.
// E a interface SuiAccount, se você a estiver usando.

export class DirectMessageService {

    /**
     * Criptografa uma mensagem usando a chave privada local do remetente e a chave pública do destinatário.
     * Implementa o fluxo 3.1.2: A_priv + B_pub -> Chave AES -> Cripto da mensagem.
     *
     * @param plaintext A mensagem de texto simples.
     * @param senderPrivateKey A chave privada ECDH local do remetente (como CryptoKey).
     * @param recipientPublicKeyBytes A chave pública ECDH do destinatário (como Uint8Array SPKI).
     * @returns {Promise<{iv: string, ciphertext: string}>} Dados criptografados prontos para a blockchain.
     */
    public async encryptMessage(
        plaintext: string,
        senderPrivateKey: CryptoKey,
        recipientPublicKeyBytes: Uint8Array
    ): Promise<{iv: string, ciphertext: string}> {

        // 1. Importar a chave pública do destinatário (do Uint8Array para CryptoKey)
        const recipientPublicKey = await this.importEcdhPublicKey(recipientPublicKeyBytes.buffer as ArrayBuffer);

        // 2. Derivar a chave AES compartilhada via ECDH
        const sharedAesKey = await this.deriveSharedAesKey(senderPrivateKey, recipientPublicKey);

        // 3. Criptografar a mensagem usando a chave AES compartilhada
        return this.encryptMessageWithAesKey(plaintext, sharedAesKey);
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
    public async decryptMessage(
      args: {
        iv: string,
        ciphertext: string,
        recipientPrivateKey: CryptoKey,
        senderPublicKeyBytes: Uint8Array
      }
    ): Promise<string> {

        // 1. Importar a chave pública do remetente (do Uint8Array para CryptoKey)
        const senderPublicKey = await this.importEcdhPublicKey(args.senderPublicKeyBytes.buffer as ArrayBuffer);

        // 2. Derivar a mesma chave AES compartilhada via ECDH
        const sharedAesKey = await this.deriveSharedAesKey(args.recipientPrivateKey, senderPublicKey);

        // 3. Descriptografar a mensagem usando a chave AES compartilhada
        return this.decryptMessageWithAesKey(args.ciphertext, args.iv, sharedAesKey);
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

    public static async example() {
      console.log("--- Demonstração do Fluxo de Direct Message (DM) E2EE ---");

        // --- Setup Inicial (Assumindo UserProfileGenerator/Service existem) ---
        const masterPassAlice = "SIG_ALICE_DM_123";
        const masterPassBob = "SIG_BOB_DM_456";
        const userProfileGenerator = new UserProfileGenerator();
        const userProfileService = new UserProfileService();
        const dmService = new DirectMessageService();

        // 1. Gerar Perfis e Chaves (Simulação de registro na blockchain)
        const aliceProfileData = await userProfileGenerator.generateProfileKeys(masterPassAlice);
        const bobProfileData = await userProfileGenerator.generateProfileKeys(masterPassBob);
        console.log("Perfis de Alice e Bob gerados.");

        // 2. Recuperar Chaves Privadas usáveis (desembrulhar localmente)
        const alicePrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(aliceProfileData, masterPassAlice);
        const bobPrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(bobProfileData, masterPassBob);
        console.log("Chaves privadas recuperadas com sucesso.");


        // --- Fluxo de Mensagem 1: Alice envia para Bob ---

        const messageFromAlice = "Olá Bob! Esta é uma mensagem E2EE da Alice.";
        console.log(`\nAlice escreve: "${messageFromAlice}"`);

        // 3. Alice Criptografa para Bob (Alice_Priv + Bob_Pub)
        const encryptedByAlice = await dmService.encryptMessage(
            messageFromAlice,
            alicePrivateKey,
            bobProfileData.publicKeySpki // Chave pública de Bob em bytes
        );
        console.log("Mensagem criptografada por Alice (Dados para Blockchain):", encryptedByAlice);

        // 4. Bob Descriptografa (Bob_Priv + Alice_Pub)
        console.log("\nBob lê a blockchain e tenta descriptografar...");
        const decryptedByBob = await dmService.decryptMessage({
            iv: encryptedByAlice.iv,
            ciphertext: encryptedByAlice.ciphertext,
            recipientPrivateKey: bobPrivateKey,
            senderPublicKeyBytes: aliceProfileData.publicKeySpki // Chave pública de Alice em bytes
        });
        console.log(`Bob descriptografa: "${decryptedByBob}"`);

        if (decryptedByBob !== messageFromAlice) {
            console.error("ERRO: A descriptografia de Bob falhou!");
            return;
        }

        // --- Fluxo de Mensagem 2: Bob envia para Alice ---

        const messageFromBob = "E aí, Alice! Recebi sua mensagem com sucesso.";
        console.log(`\nBob escreve: "${messageFromBob}"`);

        // 5. Bob Criptografa para Alice (Bob_Priv + Alice_Pub)
        const encryptedByBob = await dmService.encryptMessage(
            messageFromBob,
            bobPrivateKey,
            aliceProfileData.publicKeySpki // Chave pública de Alice em bytes
        );
        console.log("Mensagem criptografada por Bob (Dados para Blockchain):", encryptedByBob);

        // 6. Alice Descriptografa (Alice_Priv + Bob_Pub)
        console.log("\nAlice lê a blockchain e tenta descriptografar...");
        const decryptedByAlice = await dmService.decryptMessage({
            iv: encryptedByBob.iv,
            ciphertext: encryptedByBob.ciphertext,
            recipientPrivateKey: alicePrivateKey,
            senderPublicKeyBytes: bobProfileData.publicKeySpki // Chave pública de Bob em bytes
        });
        console.log(`Alice descriptografa: "${decryptedByAlice}"`);

        if (decryptedByAlice !== messageFromBob) {
            console.error("ERRO: A descriptografia de Alice falhou!");
            return;
        }

        console.log("\nSUCESSO: O fluxo completo de mensagens DM E2EE funcionou perfeitamente em ambas as direções.");
    }
}

// Importe ou defina aqui as funções auxiliares de codificação/decodificação
// (arrayBufferToBase64Url, base64UrlToArrayBuffer) do nosso arquivo CryptoUtils.ts.

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
    public async obfuscateMessage(plaintext: string): Promise<{iv: string, ciphertext: string}> {
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
    public async deObfuscateMessage(iv: string, ciphertext: string): Promise<string> {
        // Garante que a chave esteja pronta antes de prosseguir
        await this.ensureKeyIsReady();

        const ciphertextBuffer = base64UrlToArrayBuffer(ciphertext);
        const ivBuffer = base64UrlToArrayBuffer(iv);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer },
            this.obfuscationKey!, // Usamos '!' (non-null assertion) pois garantimos a existência logo acima
            ciphertextBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }

    public static async example() {
      // Assumimos que as funções de CryptoUtils estão importadas
      const creatorAddress = "0x12345abcdef...";

      // 1. Instanciar a classe
      const channelService = new PublicChannelService(creatorAddress);
      // Não é mais necessário chamar um método initialize() separado!

      const message1 = "Mensagem 1 ofuscada.";

      // 2. Ofuscar a mensagem (a chave será derivada automaticamente aqui)
      const obfuscated1 = await channelService.obfuscateMessage(message1);
      console.log("Msg 1:", obfuscated1.ciphertext);

      // 3. Desofuscar (rápido, a chave já está em memória)
      const deObfuscatedMessage1 = await channelService.deObfuscateMessage(obfuscated1.iv, obfuscated1.ciphertext);
      console.log("Msg 1 Desofuscada:", deObfuscatedMessage1);
    }
}

// Importe a interface UserProfileData e as funções auxiliares de Base64 se necessário
// (arrayBufferToBase64Url, base64UrlToArrayBuffer de CryptoUtils.ts).

// Interface para armazenar a chave da sala embrulhada na Blockchain (mapeado por usuário/sala)
export interface WrappedRoomKeyData {
    wrappedKey: Uint8Array;     // A chave AES da sala, embrulhada (Base64URL)
    iv: Uint8Array;             // O IV usado para este embrulho específico (Base64URL)
    inviterPublicKey: Uint8Array; // A chave pública ECDH (SPKI Base64URL) de quem convidou
}

// Importe a interface UserProfileData e as funções auxiliares de Base64 (se ainda precisar delas em outro lugar)
// import { base64UrlToArrayBuffer } from './CryptoUtils';

export class PrivateGroupService {

    private roomAesKey: CryptoKey | null = null;
    private inviterPublicKeyBytes: Uint8Array | null = null;

    /**
     * Inicializa o serviço, desembrulhando a chave mestra da sala.
     *
     * @param wrappedRoomKeyData Os dados do objeto mapeado na Blockchain (agora Uint8Array).
     * @param userPrivateKeyLocal Chave privada ECDH do usuário local (como CryptoKey).
     */
    public async initialize(wrappedRoomKeyData: WrappedRoomKeyData, userPrivateKeyLocal: CryptoKey): Promise<void> {
        this.inviterPublicKeyBytes = wrappedRoomKeyData.inviterPublicKey;

        // Desembrulha a chave da sala (AES) usando ECDH
        this.roomAesKey = await this.unwrapRoomKey(
            wrappedRoomKeyData.wrappedKey.buffer as ArrayBuffer, // Passa o ArrayBuffer subjacente
            wrappedRoomKeyData.iv.buffer as ArrayBuffer,         // Passa o ArrayBuffer subjacente
            wrappedRoomKeyData.inviterPublicKey.buffer as ArrayBuffer, // Passa o ArrayBuffer subjacente
            userPrivateKeyLocal
        );
    }

    /**
     * Desembrulha a chave AES da sala usando a chave privada do usuário local e a pública do convidador.
     */
    private async unwrapRoomKey(
        wrappedKeyBuffer: ArrayBuffer,
        ivBuffer: ArrayBuffer,
        inviterPubKeyBuffer: ArrayBuffer,
        userPrivateKeyLocal: CryptoKey
    ): Promise<CryptoKey> {
        // 1. Importar a chave pública de quem convidou (ArrayBuffer -> CryptoKey)
        const inviterPublicKey = await this.importEcdhPublicKey(inviterPubKeyBuffer);

        // 2. Derivar a CHAVE SECRETA COMPARTILHADA
        const sharedSecretECDH = await this.deriveSharedAesKey(userPrivateKeyLocal, inviterPublicKey);

        // 3. Descriptografar o objeto da chave mestra da sala usando a chave compartilhada
        const roomKeyBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer },
            sharedSecretECDH,
            wrappedKeyBuffer
        );

        // 4. Importar o material bruto da chave AES da sala (256 bits) para uma CryptoKey utilizável
        return window.crypto.subtle.importKey(
            "raw",
            roomKeyBuffer,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // --- Métodos de Mensagens (Usam a chave mestra da sala para I/O string/string) ---
    // NOTA: Estes métodos ainda usam Base64URL para a entrada/saída das mensagens reais,
    // pois as mensagens (ciphertext + iv) provavelmente serão strings na Sui/frontend.

    public async encryptMessage(plaintext: string): Promise<{iv: string, ciphertext: string}> {
        if (!this.roomAesKey) throw new Error("Serviço não inicializado. Chave da sala não carregada.");

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv.buffer },
            this.roomAesKey!,
            new TextEncoder().encode(plaintext)
        );

        return {
            iv: arrayBufferToBase64Url(iv), // Exporta IV para string B64URL
            ciphertext: arrayBufferToBase64Url(encryptedBuffer) // Exporta Ciphertext para string B64URL
        };
    }

    public async decryptMessage(iv: string, ciphertext: string): Promise<string> {
        if (!this.roomAesKey) throw new Error("Serviço não inicializado. Chave da sala não carregada.");

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64UrlToArrayBuffer(iv) }, // Importa IV da string B64URL
            this.roomAesKey!,
            base64UrlToArrayBuffer(ciphertext) // Importa Ciphertext da string B64URL
        );

        return new TextDecoder().decode(decryptedBuffer);
    }

    // --- Métodos Auxiliares de Criptografia (Reutilizados) ---
    private async importEcdhPublicKey(publicKeyBuffer: ArrayBuffer): Promise<CryptoKey> {
        return window.crypto.subtle.importKey("spki", publicKeyBuffer, { name: "ECDH", namedCurve: "P-256" }, true, []);
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

public static async example () {
    // Importe todas as classes e utilitários necessários (CryptoUtils.ts, UserProfileGenerator.ts, UserProfileService.ts, PrivateGroupService.ts)

    console.log("--- Demonstração do Fluxo de Grupo Privado CORRIGIDO ---");

    // Simulação da Master Password (assinatura da carteira Sui)
    const masterPassAlice = "SIG_ALICE_AIZ8UKhTlnJFQ";
    const masterPassBob = "SIG_BOB_CIZ8UKhTlnJFQ";

    // 1. Setup inicial: Gerar e "armazenar na blockchain" os perfis de Alice e Bob
    const userProfileGenerator = new UserProfileGenerator();
    const aliceProfileData = await userProfileGenerator.generateProfileKeys(masterPassAlice);
    const bobProfileData = await userProfileGenerator.generateProfileKeys(masterPassBob);

    // 2. Recuperar as chaves privadas como CryptoKey usáveis (usando UserProfileService)
    const userProfileService = new UserProfileService();
    const alicePrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(aliceProfileData, masterPassAlice);
    const bobPrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(bobProfileData, masterPassBob);

    console.log("Perfis e chaves privadas recuperadas com sucesso.");


    // 3. ALICE (ADMIN) GERA O OBJETO DE CONVITE PARA BOB (A SER SALVO NA SUI)

    // A. Alice gera a chave mestra AES aleatória para a sala (somente ela faz isso na criação)
    const roomAesKeyMaterial = window.crypto.getRandomValues(new Uint8Array(32));

    // B. Alice prepara a chave pública de Bob para a derivação ECDH
    const bobPubKeyForAliceImport = await window.crypto.subtle.importKey(
        "spki",
        bobProfileData.publicKeySpki.buffer as ArrayBuffer, // Usa o buffer do Uint8Array
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    // C. Alice deriva o segredo compartilhado com Bob (AlicePrivate + BobPublic)
    const aliceBobSharedSecretKeyWrapper = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: bobPubKeyForAliceImport },
        alicePrivateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    // D. Alice embrulha a chave mestra da sala usando o segredo compartilhado
    const ivWrap = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedRoomKeyForBobBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivWrap.buffer },
        aliceBobSharedSecretKeyWrapper, // Usa a chave com o uso 'encrypt'
        roomAesKeyMaterial // O material bruto da chave AES da sala
    );

    // E. Cria o objeto que será armazenado na blockchain, mapeado para Bob e a Sala (Usando Uint8Array agora)
    const bobInviteObject: WrappedRoomKeyData = {
        wrappedKey: new Uint8Array(wrappedRoomKeyForBobBuffer),
        iv: ivWrap,
        inviterPublicKey: aliceProfileData.publicKeySpki // A chave pública de Alice (Uint8Array)
    };
    console.log("Objeto de convite para Bob gerado e salvo na Sui:", bobInviteObject);

    // Alice prepara a sua própria chave pública pra importação
    const alicePubKeyForAliceImport  = await window.crypto.subtle.importKey(
        "spki",
        aliceProfileData.publicKeySpki.buffer as ArrayBuffer, // Usa o buffer do Uint8Array
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    const aliceAliceSharedSecretKeyWrapper = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: alicePubKeyForAliceImport },
        alicePrivateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
    const ivWrapAlice = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedRoomKeyForAliceBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivWrapAlice.buffer },
        aliceAliceSharedSecretKeyWrapper,
        roomAesKeyMaterial
    );

    const aliceInviteObject: WrappedRoomKeyData = {
        wrappedKey: new Uint8Array(wrappedRoomKeyForAliceBuffer),
        iv: ivWrapAlice,
        inviterPublicKey: aliceProfileData.publicKeySpki
    };


    const message = "Olá Alice, recebi o convite do grupo com sucesso!";

    // 4. BOB ENTRA NA SALA E DESEMBRULHA (usando PrivateGroupService)
    const bobService = new PrivateGroupService();
    console.log("\nBob está inicializando o serviço de grupo com seu objeto de convite...");
    await bobService.initialize(bobInviteObject, bobPrivateKey);

    console.log("Bob recuperou a chave mestra da sala com sucesso!");


    // 5. BOB LÊ/ENVIA MENSAGENS (usando a chave mestra da sala)

    // Bob criptografa a mensagem (retorna strings Base64URL para transporte/armazenamento)
    const encryptedByBob = await bobService.encryptMessage(message);
    console.log("Mensagem criptografada por Bob:", encryptedByBob.ciphertext);

    // Bob descriptografa a própria mensagem para testar
    let decryptedByBob = await bobService.decryptMessage(encryptedByBob.iv, encryptedByBob.ciphertext);
    console.log("Mensagem descriptografada por Bob:", decryptedByBob);



    // 6. ALICE LÊ a mensagem de BOB (usando seu próprio invite object da blockchain)
    console.log("\nAlice recupera a mensagem de Bob da 'blockchain'.");
    console.log("Alice recupera SEU PRÓPRIO objeto de convite da 'blockchain' para inicialização.");

    const aliceService = new PrivateGroupService();

    // Alice inicializa seu serviço de grupo exatamente como Bob fez:
    // Usando seu objeto de convite (aliceInviteObject) e sua chave privada (alicePrivateKey) para desembrulhar a roomKey.
    await aliceService.initialize(aliceInviteObject, alicePrivateKey);

    console.log("Alice inicializou seu serviço de grupo desembrulhando a chave com sucesso.");

    // Alice descriptografa a mensagem que Bob enviou
    let decryptedByAlice = await aliceService.decryptMessage(encryptedByBob.iv, encryptedByBob.ciphertext);
    console.log("Mensagem descriptografada por Alice:", decryptedByAlice);

    if (decryptedByAlice === message) {
        console.log("VERIFICAÇÃO: Alice leu a mensagem original com sucesso.");
    }

    if (message === decryptedByBob && message === decryptedByAlice) {
        console.log("\nSUCESSO: O fluxo completo do grupo privado funcionou perfeitamente.");
    }
  }

}
