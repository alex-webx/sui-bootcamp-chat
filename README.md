## Sui Chat
Projeto criado para a prática dos conceitos aprendidos no Bootcamp Brasil de Novembro/2025.

### Estrutura dos objetos no contrato:
- `UserProfileRegistry`: deve ser um singleton da aplicação, responsável por armazenar o mapeamento entre [Endereço da Carteira] <-> [Perfil].
- `UserProfile`: representa o perfil é está associado a uma carteira. Deve ser único por carteira, e estar mapeado no objeto central `UserProfileRegistry`. Pode ser editado ou deletado pelo usuário.
- `ChatRoom`: representa uma sala de conversa. Qualquer carteira pode criar uma sala, e todas as salas são públicas (shared object), porém o `owner` é o administrador da sala, recebendo um objeto do tipo `ChatRoomAdminCap` para controle de permissão de acesso para adicionar moderadores e desbanir usuários previamente banidos por ele mesmo ou pelos moderadores.
- `Message`: representa uma mensagem, apenas o `owner` pode editá-la e excluí-la (controle de acesso com `MessageEditCap`)
- `MessageBlock`: diversas instâncias são associadas ao `ChatRoom` como um campo dinâmico através de um indexador sequencial. Cada bloco armazena os IDs de `Messages` em um vetor, com limitação de quantidade máxima por bloco
- Qualquer pessoa pode participar e mandar mensagem em uma sala

### Conceitos estudados e aplicados além do material do Bootcamp:
- Função de inicialização `init` (para criação de singletons dos objetos `UserProfileRegistry` e `ChatRoomRegistry`)
- Tipo `Table` (e leitura via sdk), para mapamento dos endereços das carteiras e perfis dos usuários, controlado pelo singleton `UserProfileRegistry` para evitar duplicidade de perfis para uma mesma carteira
- Utilização de propriedade opcional com `Option`
- Utilização do objeto global `Clock`
- Utilização de `ID` ao invés de `UID` para armazenar referências sem precisar consumir o objeto (usando a função `uid_to_inner`)
- Uso de dynamic fields
- Emissão de eventos
- Uso de capabilities para controle de acesso de recursos e funções
- Front-end em desenvolvimento: criação de uma aplicação em Vue3 para conectar e consumir as funções dos contratos, utilizando as bibliotecas da Mysten Labs (`@mysten/sui` e `@mysten/wallet-standard`)

# Publicação dos contratos
Na pasta `./contracts`, executar:
```
   node publish
```
Os IDs dos objetos singletons `UserProfileRegistry` e `ChatRoomRegistry` são exportados automaticamente para o arquivo `./contracts/.env.{ENV}` para facilitar integração no front-end.

O arquivo `Move.lock` é movido para a pasta `./_pubhistory/{ENV}`, junto com uma cópia do arquivo `./env` gerado.

# Front-End Live DEMO
[Live demo](https://sui-chat.netlify.app)

# TODO
Para as próximas versões:
- Lógica para adicionar e remover moderadores a um chat (contrato OK, falta implementação no front-end)
- Lógica para moderadores banirem/desbanirem usuários em um chat (contrato OK, falta implementação no front-end)
- Utilização de armazemento externo de imagens (no momento está aceitando apenas URL/data:image em um campo String da struct)
- ...


# Criptografia das mensagens

Quando um usuário cria o seu `UserProfile`, a interface gera inicialmente um par de chaves assimétricas ECDH, que irá conter
as informações `public key (pubkey)`, `iv`, `salt` e `private key (privkey)`.

Os valores de `pubkey`, `iv` e `salt` são armazenados e salvos diretamente no objeto blockchain `UserProfile` do usuário.

Já a `privkey` não pode ser armazenada diretamente na blockchain. Para isso a interface solicita para que o usuário assine uma mensagem de texto fixa(exemplo: `Bem-vindo ao Sui Chat. Carteira: 0x...`), gerando um hash determinístico que somente sua carteira é capaz de gerar. Esse hash resultante será a chave simétrica para criptografar a `privkey`, gerando um novo valor (`derivprivkey`) que será armazenado no `UserProfile` do usuário.

Temos então, no perfil do usuário:
- `pubkey`: chave pública do usuário, que será utilizada por terceiros para criptografar informações que somente o usuário seja capaz de descriptografar com sua chave privada `privkey` (que está criptografada simetricamente dentro de `derivprivkey`)
- `iv` e `salt`: initialization vector e salt utilizados na geração da chave privada
- `derivprivey`: chave privada `privkey` criptografada com a assinatura da mensagem fixa
- `privkey`: esta informação não é armazenada em blockchain por motivos óbvios, e pode ser recuperada a partir da descriptografia de `derivprivkey`, utilizando o hash da mensagem fixa

## Sala privada entre 2 pessoas (DM)
- É utilizado criptografia E2EE (end-to-end-encryption) com ECDH (Elliptic Curve Diffie-Hellman) para acordo e geração da chave simétrica que será utilizada para criptografar as mensagens do chat particular.
- Quando o `Usuário A` inicia uma conversa particular com o `Usuário B`, o `Usuário A` recupera a chave pública do `Usuário B (B.pubkey)`. Com a sua própria `A.privkey` e a chave pública `B.pubkey` do `Usuário B`, o `Usuário A` gera uma `shared AES key`. Essa chave compartilhada é então armazenada no `ParticipantInfo.room_key` do `Usuário B`.
- Ao aceitar o convite de `Usuário A`, o `Usuário B` irá realizar o mesmo processo (com sua chave privada `B.privkey` e a chave pública `A.pubkey` do `Usuário A`, ele irá gerar o `ParticipantInfo.room_key` para o `Usuário A`)
- Neste ponto, ambas as partes são capazes de derivar a partir da `shared AES key` armazenada em seu perfil, a chave final que será utilizada para criptografar e descriptografar as mensagens. Graças ao algoritmo ECDH, essa chave final será igual para ambos, e somente eles conseguirão deriva-la utilizando, cada um, sua própria chave privada e shared AES key.

## Fluxo Criptográfico Revisado
1. Ao criar um perfil, para cada usuário, será gerada um par de chaves ECDH associado ao seu perfil.
   1. A chave pública será armazenada no perfil do usuário, na blockchain
   2. A chave privada será criptografada com AES utilizando uma derivação da assinatura da carteira de uma mensagem fixa como "senha".
      1. A chave privada criptografada, junto com o salt e IV do AES são armanados na blockchain junto a public key.

2. A chave pública de cada usuário é utilizada pelos demais usuários para a troca de informações. 
Sempre que alguém quiser enviar um "segredo", basta obter a public key do usuário e criptografar a mensagem secreta.

3. O comportamento varia conforme o tipo de chat:
	1. Se for direct message, entre duas pessoas, é utilizado E2EE completo:	
		1. As mensagens de texto serão criptografas usando uma chave AES derivada a partir das chaves ECDH dos dois usuários
		2. Usuário A envia mensagem para Usuário B: usuário A precisa derivar a chave AES, então, com sua chave privada e a chave pública de B ele consegue derivar essa chave AES que será utilizada para criptografia da mensagem
		3. Quando o usuário B quiser ler a mensagem, ele irá derivar a mesma chave AES utilizando sua chave privada e a chave pública de A. Com a chave AES gerada, ele irá descriptografar a mensagem.
	2. Se for um canal público, a criptografia será apenas para obsfuscar as mensagens.
		1. Ao criar a sala, será gerada uma chave simétrica AES simples e armazenada no objeto da sala. Esta chave pode estar criptografada por derivação PBKDF2 cnohecido pela aplicação, como o enderço do Administrador. Não garante segurança nem privacidade, mas obsfusca e dificulta o acesso aos dados.
	3. Se for um chat de grupo privada, será necessária uma abordagem mais complexa.
		1. A ideia é criar uma chave AES aleatória para a sala, mas o compartilhamento da chave AES será feito utilizando ECDH. Entã é necessário um convite criptográfico obrigatório para a troca de segredos, que sempre acontecerá entre 2 pessoas, utilizando ECDH.
		2. Ao criar o chat, o administrador gera também uma chave AES aleatória. Esta chave será responsável por criptografar as mensagens trocadas neste chat. Esta chave não será armazenada aberta diretamente na blockchain, e nem deve estar hard-coded na aplicação.
		3. A ideia é que cada usuário, para cada sala privada, possua armazenado em um objeto mapeado ao seu perfil e à sala. Neste objeto será armazenada a chave AES da sala, porém, criptografada com uma chave AES derivada da chave privada ECDH do usuário inicial (Administrador, em um primeiro instante) ao derivar com a chave pública ECDH do usuário convidado. Neste objeto, a chave pública de quem convida também é armazenada para facilitar ao convidado derivar a chave de descriptografia, utilizando sua própria chave privada e a chave pública de quem o convidou.
		4. Para enviar e ler mensagens, cada usuário irá obter de seu perfil a chave AES da sala criptografada em seu objeto, e descriptografar utilizando sua própria chave privada e a chave pública de quem o convidou. Com a chave AES em mãos, basta descriptografar/criptografar as mensagens.