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

# TODO
Para as próximas versões:
- Lógica para adicionar e remover moderadores a um chat (contrato OK, falta implementação no front-end)
- Lógica para moderadores banirem/desbanirem usuários em um chat (contrato OK, falta implementação no front-end)
- Utilização de armazemento externo de imagens (no momento está aceitando apenas URL/data:image em um campo String da struct)
- ...