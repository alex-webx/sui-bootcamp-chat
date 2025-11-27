import { UserProfileGenerator } from './UserProfileGenerator';
import { UserProfileService } from './UserProfileService';
import { PrivateGroupService, WrappedRoomKeyData } from './PrivateGroupService';
import { DirectMessageService } from './DirectMessageService';
import { PublicChannelService } from './PublicChannelService';

const testUserProfileGenerator = async () => {
  // Simulação da Master Password (assinatura da carteira Sui)
  const masterPass = "AIZ8UKhTlnJFQi293Naq4Dt+/k4KM51Wh8np4i2LJf62LZDA3A/wKIpunNsZ4EKGtGoQzFMImt+d8XPGT1Zq9ADIJa2I1zvCiRC06cyZckqM9mEVHveex2+5a3sSThbV7Q==";

  const generator = new UserProfileGenerator();
  const profileData = await generator.generateProfileKeys(masterPass);

  console.log("Dados do perfil gerados, prontos para a Blockchain Sui:");
  console.log("Chave Pública (Uint8Array):", profileData.publicKeySpki);
  console.log("Chave Privada Embrulhada (Uint8Array):", profileData.privateKeyWrapped);
  console.log("Salt (Uint8Array):", profileData.salt);
  console.log("IV (Uint8Array):", profileData.iv);
};

const testUserProfileService = async () => {
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
};

const testPublicChannelService = async() => {
  // Assumimos que as funções de CryptoUtils estão importadas
  const creatorAddress = "0x12345abcdef...";

  // 1. Instanciar a classe
  const channelService = new PublicChannelService(creatorAddress);
  // Não é mais necessário chamar um método initialize() separado!

  const message1 = "Mensagem 1 ofuscada.";

  // 2. Ofuscar a mensagem (a chave será derivada automaticamente aqui)
  const obfuscated1 = await channelService.encryptMessage(message1);
  console.log("Msg 1:", obfuscated1.ciphertext);

  // 3. Desofuscar (rápido, a chave já está em memória)
  const deObfuscatedMessage1 = await channelService.decryptMessage({ iv: obfuscated1.iv, ciphertext: obfuscated1.ciphertext });
  console.log("Msg 1 Desofuscada:", deObfuscatedMessage1);
};

const testDirectMessageService = async () => {
  console.log("--- Demonstração do Fluxo de Direct Message (DM) E2EE ---");

  // --- Setup Inicial (Assumindo UserProfileGenerator/Service existem) ---
  const masterPassAlice = "SIG_ALICE_DM_123";
  const masterPassBob = "SIG_BOB_DM_456";
  const userProfileGenerator = new UserProfileGenerator();
  const userProfileService = new UserProfileService();

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
  const dmAliceService = new DirectMessageService(alicePrivateKey, bobProfileData.publicKeySpki);
  const encryptedByAlice = await dmAliceService.encryptMessage(messageFromAlice);
  console.log("Mensagem criptografada por Alice (Dados para Blockchain):", encryptedByAlice);

  // 4. Bob Descriptografa (Bob_Priv + Alice_Pub)
  console.log("\nBob lê a blockchain e tenta descriptografar...");
  const dmBobService = new DirectMessageService(bobPrivateKey, aliceProfileData.publicKeySpki);
  const decryptedByBob = await dmBobService.decryptMessage({
    iv: encryptedByAlice.iv,
    ciphertext: encryptedByAlice.ciphertext
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
  const encryptedByBob = await dmBobService.encryptMessage(messageFromBob);
  console.log("Mensagem criptografada por Bob (Dados para Blockchain):", encryptedByBob);

  // 6. Alice Descriptografa (Alice_Priv + Bob_Pub)
  console.log("\nAlice lê a blockchain e tenta descriptografar...");
  const decryptedByAlice = await dmAliceService.decryptMessage({
    iv: encryptedByBob.iv,
    ciphertext: encryptedByBob.ciphertext
  });
  console.log(`Alice descriptografa: "${decryptedByAlice}"`);

  if (decryptedByAlice !== messageFromBob) {
    console.error("ERRO: A descriptografia de Alice falhou!");
    return;
  }

  console.log("\nSUCESSO: O fluxo completo de mensagens DM E2EE funcionou perfeitamente em ambas as direções.");
};

const testPrivateGroupService = async () => {
  console.log("--- Demonstração do Fluxo de Grupo Privado (Utilizando PrivateGroupService atualizado) ---");

  // Simulação da Master Password (assinatura da carteira Sui)
  const masterPassAlice = "SIG_ALICE_AIZ8UKhTlnJFQ";
  const masterPassBob = "SIG_BOB_CIZ8UKhTlnJFQ";

  // 1. Setup inicial: Gerar e "armazenar na blockchain" os perfis de Alice e Bob
  // (Assumindo que estas classes existem e funcionam)
  const userProfileGenerator = new UserProfileGenerator();
  const aliceProfileData = await userProfileGenerator.generateProfileKeys(masterPassAlice);
  const bobProfileData = await userProfileGenerator.generateProfileKeys(masterPassBob);

  // 2. Recuperar as chaves privadas como CryptoKey usáveis (usando UserProfileService)
  // (Assumindo que estas classes existem e funcionam)
  const userProfileService = new UserProfileService();
  const alicePrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(aliceProfileData, masterPassAlice);
  const bobPrivateKey: CryptoKey = await userProfileService.unwrapPrivateKey(bobProfileData, masterPassBob);

  console.log("Perfis e chaves privadas recuperadas com sucesso.");


  // 3. ALICE (ADMIN) GERA O OBJETO DE CONVITE PARA BOB E PARA ELA MESMA (A SER SALVO NA SUI)

  // A. Alice gera a chave mestra AES aleatória para a sala (SOMENTE UMA VEZ)
  const roomAesKeyMaterial = await PrivateGroupService.generateRoomKeyMaterial();
  console.log(`Chave mestra da sala gerada (${roomAesKeyMaterial.length} bytes).`);


  // B. Alice gera o objeto de convite para BOB, que será salvo na Blockchain
  const bobInviteObject: WrappedRoomKeyData = await PrivateGroupService.generateInvitationKey(
    roomAesKeyMaterial,                 // A chave bruta da sala
    alicePrivateKey,                    // A chave privada da Alice (convidante)
    aliceProfileData.publicKeySpki,     // A chave pública da Alice (para referência no desembrulho)
    bobProfileData.publicKeySpki        // A chave pública do Bob (destinatário)
  );
  console.log("Objeto de convite para Bob gerado e salvo na Sui:", bobInviteObject);


  // C. Alice gera o objeto de convite para ELA MESMA, que será salvo na Blockchain
  const aliceInviteObject: WrappedRoomKeyData = await PrivateGroupService.generateInvitationKey(
    roomAesKeyMaterial,                 // A chave bruta da sala
    alicePrivateKey,                    // A chave privada da Alice (convidante)
    aliceProfileData.publicKeySpki,     // A chave pública da Alice (para referência no desembrulho)
    aliceProfileData.publicKeySpki      // Alice é o próprio destinatário
  );
  console.log("Objeto de convite para Alice gerado e salvo na Sui:", aliceInviteObject);


  const message = "Olá Alice, recebi o convite do grupo com sucesso!";


  // 4. BOB ENTRA NA SALA E DESEMBRULHA (usando PrivateGroupService)
  console.log("\nBob está inicializando o serviço de grupo com seu objeto de convite...");
  const bobService = new PrivateGroupService(bobInviteObject, bobPrivateKey);
  console.log("Bob recuperou a chave mestra da sala com sucesso!");


  // 5. BOB LÊ/ENVIA MENSAGENS (usando a chave mestra da sala)
  // NOTA: Os métodos encryptMessage/decryptMessage precisam das funções Base64URL funcionando para este passo.
  // Substitua as chamadas abaixo pelas suas implementações reais se necessário:

  const encryptedByBob = await bobService.encryptMessage(message);
  console.log("Mensagem criptografada por Bob:", encryptedByBob.ciphertext);

  let decryptedByBob = await bobService.decryptMessage({ iv: encryptedByBob.iv, ciphertext: encryptedByBob.ciphertext });
  console.log("Mensagem descriptografada por Bob:", decryptedByBob);

  // 6. ALICE LÊ a mensagem de BOB

  console.log("\nAlice recupera SEU PRÓPRIO objeto de convite da 'blockchain' para inicialização.");

  // Alice inicializa seu serviço de grupo exatamente como Bob fez:
  const aliceService = new PrivateGroupService(aliceInviteObject, alicePrivateKey);
  console.log("Alice inicializou seu serviço de grupo desembrulhando a chave com sucesso.");

  // Alice descriptografa a mensagem que Bob enviou
  let decryptedByAlice = await aliceService.decryptMessage({ iv: encryptedByBob.iv, ciphertext: encryptedByBob.ciphertext });
  console.log("Mensagem descriptografada por Alice:", decryptedByAlice);

  if (decryptedByAlice === message) {
    console.log("VERIFICAÇÃO: Alice leu a mensagem original com sucesso.");
  }

  if (message === decryptedByBob && message === decryptedByAlice) {
    console.log("\nSUCESSO: O fluxo completo do grupo privado funcionou perfeitamente.");
  }
};

export const runTests = async () => {
  await testUserProfileGenerator();
  await testUserProfileService();
  await testDirectMessageService();
  await testPublicChannelService();
  await testPrivateGroupService();
};

export {
  UserProfileGenerator,
  UserProfileService,
  PrivateGroupService,
  DirectMessageService,
  PublicChannelService
};
