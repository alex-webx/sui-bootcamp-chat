#[test_only]
module 0x0::chat_room_tests {
    use sui::test_scenario::{Self as test, Scenario};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use 0x0::chat_room::{Self, ChatRoom}; 
    use 0x0::user_profile::{Self, UserProfile};

    // Função auxiliar para configurar o cenário inicial
    fun setup_scenario(ctx: &mut TxContext): (UserProfile, ChatRoom) {
        // Crie perfis e salas de chat simulados para o teste
        let user_profile = user_profile::create_user_profile(ctx);

        let chat_room = chat_room::create_chat_room(ctx); // Assumindo que você tem uma função create_chat_room
        (user_profile, chat_room)
    }

    #[test]
    fun test_send_message_with_none_reply() {
        let owner = @0xA; // Endereço simulado para o proprietário/remetente
        let scenario = test::begin(owner);

        // Inicia a primeira transação para configurar objetos
        test::next_tx(&mut scenario, owner);
        let (mut user_profile, mut chat_room) = setup_scenario(test::ctx(&mut scenario));

        // Crie um relógio simulado, necessário para a função
        let mut clock = clock::create_for_testing(test::ctx(&mut scenario));

        // --- Execução do teste ---

        let content = string::utf8(b"Hello, world!");
        // Usando option::none() para representar a ausência de resposta
        let reply_to_id: Option<ID> = option::none();
        // Usando vector::empty() para representar um vetor vazio de URLs de mídia
        let media_url_list = vector::empty<string::String>();

        // Chame a função send_message
        // Note: Em testes Move, referências mutáveis (&mut T) ou imutáveis (&T) são tratadas automaticamente pelo framework.
        let message_id = chat_room::send_message(
            &mut user_profile,
            &mut chat_room,
            content,
            reply_to_id,
            media_url_list,
            &clock,
            test::ctx(&mut scenario)
        );

        // --- Asserts / Verificações ---

        // Verifique se a mensagem foi criada com sucesso e tem um ID válido (o ID não será zero)
        assert!(!object::is_zero(&message_id), 0); 
        // Você pode adicionar mais verificações, como garantir que a mensagem esteja na sala de chat, etc.

        // --- Limpeza do cenário ---

        // Termina o cenário e limpa os objetos criados
        test::end(scenario);
        clock::destroy_for_testing(clock);
        // Descarte user_profile e chat_room se não forem usados em transações futuras
    }
}
