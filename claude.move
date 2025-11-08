module chat::multi_user_chat {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use std::vector;
    use std::option::{Self, Option};
    use sui::table::{Self, Table};
    use sui::dynamic_field as df;

    // ==================== Erros ====================
    const ENotAuthorized: u64 = 1;
    const EMessageTooLong: u64 = 2;
    const EUsernameTooLong: u64 = 3;
    const ERoomNotFound: u64 = 4;
    const EUserBanned: u64 = 5;
    const EBlockFull: u64 = 6;
    const ENotMessageOwner: u64 = 7;

    // ==================== Constantes ====================
    const MAX_MESSAGE_LENGTH: u64 = 500;
    const MAX_USERNAME_LENGTH: u64 = 30;
    const MESSAGES_PER_BLOCK: u64 = 100; // IDs por bloco (32 bytes cada = 3.2KB max)

    // ==================== Estruturas ====================
    
    /// Índice global de salas de chat
    public struct ChatRoomRegistry has key {
        id: UID,
        rooms: Table<ID, RoomMetadata>,
        room_count: u64,
    }

    /// Metadata de uma sala (para listagem rápida)
    public struct RoomMetadata has store, copy, drop {
        name: String,
        owner: address,
        created_at: u64,
        message_count: u64,
        member_count: u64,
        is_private: bool,
    }

    /// Sala de chat principal
    public struct ChatRoom has key, store {
        id: UID,
        name: String,
        owner: address,
        created_at: u64,
        message_count: u64,
        current_block_number: u64,
        banned_users: vector<address>,
        moderators: vector<address>,
        is_private: bool,
    }

    /// Bloco de IDs de mensagens (limitado a MESSAGES_PER_BLOCK IDs)
    /// Armazena apenas os IDs, as mensagens são objetos separados
    public struct MessageBlock has key, store {
        id: UID,
        room_id: ID,
        block_number: u64,
        message_ids: vector<ID>,  // ← Apenas IDs, não objetos completos!
        created_at: u64,
    }

    /// Mensagem como objeto independente
    /// Cada mensagem é owned pelo autor inicialmente
    public struct Message has key, store {
        id: UID,
        room_id: ID,
        block_number: u64,
        message_number: u64,
        sender: address,
        username: String,
        content: String,
        timestamp: u64,
        reply_to: Option<ID>,
        edited: bool,
        reactions: Table<String, vector<address>>, // emoji -> list of users
    }

    /// Perfil de usuário
    public struct UserProfile has key {
        id: UID,
        owner: address,
        username: String,
        created_at: u64,
        message_count: u64,
        rooms_joined: vector<ID>,
    }

    /// Capability de administrador da sala
    public struct RoomAdminCap has key, store {
        id: UID,
        room_id: ID,
    }

    /// Capability de editar mensagem (dada ao autor)
    public struct MessageEditCap has key, store {
        id: UID,
        message_id: ID,
    }

    // ==================== Eventos ====================
    
    public struct MessageSentEvent has copy, drop {
        message_id: ID,
        room_id: ID,
        block_number: u64,
        message_number: u64,
        sender: address,
        username: String,
        content: String,
        timestamp: u64,
        reply_to: Option<ID>,
    }

    public struct MessageEditedEvent has copy, drop {
        message_id: ID,
        room_id: ID,
        new_content: String,
        timestamp: u64,
    }

    public struct MessageDeletedEvent has copy, drop {
        message_id: ID,
        room_id: ID,
        deleted_by: address,
    }

    public struct ReactionAddedEvent has copy, drop {
        message_id: ID,
        room_id: ID,
        user: address,
        emoji: String,
    }

    public struct RoomCreatedEvent has copy, drop {
        room_id: ID,
        name: String,
        owner: address,
        is_private: bool,
        timestamp: u64,
    }

    public struct NewBlockCreatedEvent has copy, drop {
        room_id: ID,
        block_number: u64,
    }

    public struct UserBannedEvent has copy, drop {
        room_id: ID,
        user: address,
        banned_by: address,
    }

    // ==================== Funções de Inicialização ====================

    fun init(ctx: &mut TxContext) {
        let registry = ChatRoomRegistry {
            id: object::new(ctx),
            rooms: table::new(ctx),
            room_count: 0,
        };
        transfer::share_object(registry);
    }

    // ==================== Funções Públicas ====================

    /// Criar perfil de usuário
    public entry fun create_user_profile(
        username: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let username_str = string::utf8(username);
        assert!(string::length(&username_str) <= MAX_USERNAME_LENGTH, EUsernameTooLong);

        let profile = UserProfile {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            username: username_str,
            created_at: clock::timestamp_ms(clock),
            message_count: 0,
            rooms_joined: vector::empty(),
        };

        transfer::transfer(profile, tx_context::sender(ctx));
    }

    /// Criar uma nova sala de chat
    public entry fun create_room(
        registry: &mut ChatRoomRegistry,
        name: vector<u8>,
        is_private: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let room_uid = object::new(ctx);
        let room_id = object::uid_to_inner(&room_uid);
        let timestamp = clock::timestamp_ms(clock);
        
        let room = ChatRoom {
            id: room_uid,
            name: string::utf8(name),
            owner: tx_context::sender(ctx),
            created_at: timestamp,
            message_count: 0,
            current_block_number: 0,
            banned_users: vector::empty(),
            moderators: vector::empty(),
            is_private,
        };

        // Criar primeiro bloco (apenas para IDs)
        let first_block = MessageBlock {
            id: object::new(ctx),
            room_id,
            block_number: 0,
            message_ids: vector::empty(),
            created_at: timestamp,
        };

        // Adicionar ao registro global
        let metadata = RoomMetadata {
            name: string::utf8(name),
            owner: tx_context::sender(ctx),
            created_at: timestamp,
            message_count: 0,
            member_count: 1,
            is_private,
        };
        table::add(&mut registry.rooms, room_id, metadata);
        registry.room_count = registry.room_count + 1;

        // Criar capability de admin
        let admin_cap = RoomAdminCap {
            id: object::new(ctx),
            room_id,
        };

        event::emit(RoomCreatedEvent {
            room_id,
            name: string::utf8(name),
            owner: tx_context::sender(ctx),
            is_private,
            timestamp,
        });

        // Armazenar o primeiro bloco como dynamic field
        df::add(&mut room.id, 0u64, first_block);

        transfer::share_object(room);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Enviar mensagem - cria objeto Message independente
    public entry fun send_message(
        registry: &mut ChatRoomRegistry,
        profile: &mut UserProfile,
        room: &mut ChatRoom,
        content: vector<u8>,
        reply_to: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verificações
        assert!(!vector::contains(&room.banned_users, &sender), EUserBanned);
        let content_str = string::utf8(content);
        assert!(string::length(&content_str) <= MAX_MESSAGE_LENGTH, EMessageTooLong);

        let timestamp = clock::timestamp_ms(clock);
        let room_id = object::uid_to_inner(&room.id);
        let current_block_num = room.current_block_number;

        // Pegar o bloco atual
        let current_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, current_block_num);

        // Se o bloco está cheio, criar um novo
        if (vector::length(&current_block.message_ids) >= MESSAGES_PER_BLOCK) {
            let new_block_num = current_block_num + 1;
            
            let new_block = MessageBlock {
                id: object::new(ctx),
                room_id,
                block_number: new_block_num,
                message_ids: vector::empty(),
                created_at: timestamp,
            };

            df::add(&mut room.id, new_block_num, new_block);
            room.current_block_number = new_block_num;

            event::emit(NewBlockCreatedEvent {
                room_id,
                block_number: new_block_num,
            });

            current_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, new_block_num);
        };

        // Criar objeto Message independente
        let message_uid = object::new(ctx);
        let message_id = object::uid_to_inner(&message_uid);

        let message = Message {
            id: message_uid,
            room_id,
            block_number: current_block.block_number,
            message_number: room.message_count,
            sender,
            username: profile.username,
            content: content_str,
            timestamp,
            reply_to,
            edited: false,
            reactions: table::new(ctx),
        };

        // Adicionar apenas o ID ao bloco
        vector::push_back(&mut current_block.message_ids, message_id);

        // Atualizar contadores
        room.message_count = room.message_count + 1;
        profile.message_count = profile.message_count + 1;

        // Atualizar metadata no registry
        let metadata = table::borrow_mut(&mut registry.rooms, room_id);
        metadata.message_count = room.message_count;

        // Adicionar sala ao perfil se novo membro
        if (!vector::contains(&profile.rooms_joined, &room_id)) {
            vector::push_back(&mut profile.rooms_joined, room_id);
            metadata.member_count = metadata.member_count + 1;
        };

        event::emit(MessageSentEvent {
            message_id,
            room_id,
            block_number: current_block.block_number,
            message_number: message.message_number,
            sender,
            username: profile.username,
            content: content_str,
            timestamp,
            reply_to,
        });

        // Criar capability de edição para o autor
        let edit_cap = MessageEditCap {
            id: object::new(ctx),
            message_id,
        };

        // Tornar mensagem compartilhada (todos podem ler)
        transfer::share_object(message);
        // Edit cap vai para o autor
        transfer::transfer(edit_cap, sender);
    }

    /// Editar mensagem (precisa da MessageEditCap)
    public entry fun edit_message(
        _edit_cap: &MessageEditCap,
        message: &mut Message,
        new_content: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let new_content_str = string::utf8(new_content);
        assert!(string::length(&new_content_str) <= MAX_MESSAGE_LENGTH, EMessageTooLong);

        message.content = new_content_str;
        message.edited = true;

        event::emit(MessageEditedEvent {
            message_id: object::uid_to_inner(&message.id),
            room_id: message.room_id,
            new_content: new_content_str,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Deletar mensagem (autor, moderador ou owner)
    public entry fun delete_message(
        room: &ChatRoom,
        message: Message,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let is_authorized = message.sender == sender || 
                           room.owner == sender ||
                           vector::contains(&room.moderators, &sender);
        
        assert!(is_authorized, ENotAuthorized);

        let message_id = object::uid_to_inner(&message.id);
        let room_id = message.room_id;

        // Destruir a mensagem
        let Message { 
            id, 
            room_id: _, 
            block_number: _,
            message_number: _,
            sender: _, 
            username: _, 
            content: _, 
            timestamp: _, 
            reply_to: _,
            edited: _,
            reactions 
        } = message;
        
        table::drop(reactions);
        object::delete(id);

        event::emit(MessageDeletedEvent {
            message_id,
            room_id,
            deleted_by: sender,
        });
    }

    /// Adicionar reação a uma mensagem
    public entry fun add_reaction(
        message: &mut Message,
        emoji: vector<u8>,
        ctx: &mut TxContext
    ) {
        let emoji_str = string::utf8(emoji);
        let sender = tx_context::sender(ctx);

        if (!table::contains(&message.reactions, emoji_str)) {
            table::add(&mut message.reactions, emoji_str, vector::empty());
        };

        let users = table::borrow_mut(&mut message.reactions, emoji_str);
        if (!vector::contains(users, &sender)) {
            vector::push_back(users, sender);

            event::emit(ReactionAddedEvent {
                message_id: object::uid_to_inner(&message.id),
                room_id: message.room_id,
                user: sender,
                emoji: emoji_str,
            });
        };
    }

    /// Remover reação
    public entry fun remove_reaction(
        message: &mut Message,
        emoji: vector<u8>,
        ctx: &mut TxContext
    ) {
        let emoji_str = string::utf8(emoji);
        let sender = tx_context::sender(ctx);

        if (table::contains(&message.reactions, emoji_str)) {
            let users = table::borrow_mut(&mut message.reactions, emoji_str);
            let (contains, index) = vector::index_of(users, &sender);
            if (contains) {
                vector::remove(users, index);
            };
        };
    }

    /// Adicionar moderador (apenas owner)
    public entry fun add_moderator(
        _admin_cap: &RoomAdminCap,
        room: &mut ChatRoom,
        moderator: address,
        ctx: &mut TxContext
    ) {
        assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);
        
        if (!vector::contains(&room.moderators, &moderator)) {
            vector::push_back(&mut room.moderators, moderator);
        };
    }

    /// Banir usuário
    public entry fun ban_user(
        room: &mut ChatRoom,
        user: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let is_authorized = room.owner == sender || 
                           vector::contains(&room.moderators, &sender);
        
        assert!(is_authorized, ENotAuthorized);
        
        if (!vector::contains(&room.banned_users, &user)) {
            vector::push_back(&mut room.banned_users, user);
            
            event::emit(UserBannedEvent {
                room_id: object::uid_to_inner(&room.id),
                user,
                banned_by: sender,
            });
        };
    }

    /// Desbanir usuário
    public entry fun unban_user(
        _admin_cap: &RoomAdminCap,
        room: &mut ChatRoom,
        user: address,
        ctx: &mut TxContext
    ) {
        assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);
        
        let (contains, index) = vector::index_of(&room.banned_users, &user);
        if (contains) {
            vector::remove(&mut room.banned_users, index);
        };
    }

    // ==================== Funções de Visualização ====================

    public fun get_total_rooms(registry: &ChatRoomRegistry): u64 {
        registry.room_count
    }

    public fun get_room_info(room: &ChatRoom): (String, address, u64, u64, u64, bool) {
        (
            room.name, 
            room.owner, 
            room.created_at, 
            room.message_count, 
            room.current_block_number,
            room.is_private
        )
    }

    public fun get_block_message_count(room: &ChatRoom, block_number: u64): u64 {
        let block = df::borrow<u64, MessageBlock>(&room.id, block_number);
        vector::length(&block.message_ids)
    }

    public fun get_message_info(message: &Message): (ID, address, String, String, u64, bool) {
        (
            message.room_id,
            message.sender, 
            message.username, 
            message.content, 
            message.timestamp,
            message.edited
        )
    }

    public fun is_user_banned(room: &ChatRoom, user: address): bool {
        vector::contains(&room.banned_users, &user)
    }

    public fun is_moderator(room: &ChatRoom, user: address): bool {
        vector::contains(&room.moderators, &user) || room.owner == user
    }

    public fun get_profile_info(profile: &UserProfile): (String, address, u64, u64) {
        (profile.username, profile.owner, profile.created_at, profile.message_count)
    }
}