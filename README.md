# Sui Chat
Projeto criado apenas para a prática dos conceitos aprendidos no Bootcamp Brasil de Novembro/2025.

## Estrutura dos objetos no [contrato](./contracts/):
- `UserProfileRegistry`: deve ser um singleton da aplicação, responsável por armazenar o mapeamento entre [Endereço da Carteira] <-> `UserProfile` (perfil do usuário).
- `UserProfile`: representa o perfil é está associado a uma carteira. Deve ser único por carteira, e estar mapeado no objeto central `UserProfileRegistry`. Pode ser editado ou deletado pelo usuário.
- `ChatRoom`: representa uma sala de conversa. Qualquer usuário pode criar uma sala, seja privada ou pública, assim como iniciar um chat privado com outro usuário.
- `Message`: representa uma mensagem, apenas o `owner` pode editá-la e excluí-la (controle de acesso com `MessageEditCap` - operações lógicas de deleção e edição). As mensagens são adicionadas em uma `Table<u64,ID>` no objeto `ChatRoom`. A chave `u64` na tabela é sequencial.
- Qualquer pessoa pode participar e mandar mensagem em uma sala pública

## Conceitos estudados e aplicados além do material do Bootcamp:
- Função de inicialização `init` (para criação de singletons dos objetos `UserProfileRegistry` e `ChatRoomRegistry`)
- Tipo `Table` (e leitura via sdk), para mapamento dos endereços das carteiras e perfis dos usuários, controlado pelo singleton `UserProfileRegistry` para evitar duplicidade de perfis para uma mesma carteira
- Utilização de propriedade opcional com `Option`
- Utilização do objeto global `Clock`
- Utilização de `ID` ao invés de `UID` para armazenar referências sem precisar consumir o objeto (usando a função `uid_to_inner`)
- Uso de dynamic fields
- Emissão de eventos
- Uso de capabilities para controle de acesso de recursos e funções
- Front-end em desenvolvimento: criação de uma aplicação em Vue3 para conectar e consumir as funções dos contratos, utilizando as bibliotecas da Mysten Labs (`@mysten/sui` e `@mysten/wallet-standard`)

<br />

# Publicação dos contratos
Na pasta [./contracts/scripts](./contracts/scripts), executar:
```
   node publish
```
Os IDs dos objetos singletons `UserProfileRegistry` e `ChatRoomRegistry` são exportados automaticamente para o arquivo `./contracts/.move.{ENV}.json` para facilitar integração no front-end.

O arquivo `Move.lock` é movido para a pasta `./_pubhistory/{ENV}`, junto com uma cópia do arquivo acima gerado.

<br />

# Front-End Live DEMO
### [Live demo](https://sui-chat.netlify.app)
- `Vue3` + `quasar` + `vite` + `Pinia` + `dexie.js`
- `@mysten/sui` e `@mysten/wallet-standard`

<br />

# TODO
Para as próximas versões:
- Lógica para adicionar e remover moderadores a um chat (contrato OK, falta implementação no front-end)
- Lógica para moderadores banirem/desbanirem usuários em um chat (contrato OK, falta implementação no front-end)
- Utilização de armazemento externo de imagens na Walrus (no momento está aceitando apenas URL/data:image em um campo String da struct)
- Estudar viabilidade de utilização de Walrus + Seal para armazenamento das mensagens; ou manter a simplicidade =D
- Se utilizado um back-end futuramente, estudar viabilidade de implementação de um relayer e/ou sponsored transactions 

<br />

# Fluxo Criptográfico
1. Ao criar um perfil, para cada usuário, será gerada um par de chaves ECDH associado ao seu perfil.
   1. A chave pública será armazenada no perfil do usuário, na blockchain
   2. A chave privada será criptografada com AES utilizando uma derivação da assinatura da carteira de uma mensagem fixa como "senha".
      1. A chave privada criptografada, junto com o salt e IV do AES são armanados na blockchain junto a public key no perfil do usuário (`UserProfile`).

2. A chave pública de cada usuário é utilizada pelos demais usuários para a troca de informações. 
Sempre que alguém quiser enviar um "segredo", basta obter a public key do usuário e criptografar a mensagem secreta.

3. O comportamento varia conforme o tipo de chat:
	1. Se for direct message, entre duas pessoas, é utilizado E2EE completo:
		1. As mensagens de texto serão criptografas usando uma chave AES derivada a partir das chaves ECDH dos dois usuários
		2. `Usuário A` envia mensagem para `Usuário B`: `Usuário A` precisa derivar a chave AES para a DM, então, com sua chave privada ECDH descriptografa e a chave pública ECDH de `Usuário B` ele consegue derivar essa chave AES que será utilizada para estabelecer a comunicação e a criptografia da mensagem
		3. Quando o `Usuário B` quiser ler a mensagem, ele irá derivar a mesma chave AES utilizando sua chave privada e a chave pública de `Usuário A`. Com a chave AES gerada (a mesma que é gerada por `Usuário A` - graças ao algoritmo ECDH), ele irá descriptografar a mensagem.
	2. Se for um canal/sala pública, a criptografia será apenas para obsfuscar as mensagens.
		1. Ao criar a sala, será gerada uma chave simétrica AES simples e armazenada no objeto da sala. 
		2. Esta chave pode estar criptografada por derivação PBKDF2 cnohecido pela aplicação, como o endereço do criador da sala. Não garante segurança nem privacidade, mas obsfusca e dificulta o acesso aos dados.
	3. Se for um chat de grupo privada, será necessária uma abordagem mais complexa e mista. A ideia é criar uma chave AES aleatória para a sala, mas o compartilhamento da chave AES será feito utilizando ECDH. Então é necessário um convite criptográfico obrigatório para a troca de segredos, que sempre acontecerá entre 2 pessoas, utilizando ECDH.
		1. Ao criar o chat, o administrador gera também uma chave AES aleatória. Esta chave será responsável por criptografar as mensagens trocadas neste chat. Esta chave não será armazenada aberta diretamente na blockchain, e nem deve estar hard-coded na aplicação.
		2. A ideia é que cada usuário, para cada sala privada, possua armazenado em um objeto mapeado ao seu perfil e à sala. Neste objeto será armazenada a chave AES da sala, porém, criptografada com uma chave AES derivada da chave privada ECDH do usuário inicial (Administrador, em um primeiro instante) ao derivar com a chave pública ECDH do usuário convidado. Neste objeto, a chave pública de quem convida também é armazenada para facilitar e garantir ao convidado derivar a chave de descriptografia, utilizando sua própria chave privada e a chave pública de quem o convidou.
		3. Para enviar e ler mensagens, cada usuário irá obter de seu perfil a chave AES da sala criptografada em seu objeto, e descriptografar utilizando sua própria chave privada e a chave pública de quem o convidou. Com a chave AES em mãos, basta descriptografar/criptografar as mensagens.