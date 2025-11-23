module chat::chat_room;

use std::string::{Self, String};
use sui::event;
use sui::clock::Clock;
use sui::table::{Self, Table};
use chat::user_profile::{Self, UserProfile};
use sui::dynamic_field as df;

const EUserBanned                 : u64 = 001;
const ENotAuthorized              : u64 = 002;
const EEmptyMessage               : u64 = 003;
const EInvalidMaxMembers          : u64 = 004;
const EMaxRoomMembersLimit        : u64 = 005;
const ENotAuthorizedToSendMessage : u64 = 006;
const ENotAuthorizedToInvite      : u64 = 007;

const MESSAGES_PER_MESSAGE_BLOCK: u64 = 100;

const ROOM_TYPE_PRIVATE_GROUP : u8 = 1;
const ROOM_TYPE_PUBLIC_GROUP  : u8 = 2;
const ROOM_TYPE_DM            : u8 = 3;

const PERMISSION_NOBODY           : u8 = 0;
const PERMISSION_ADMIN            : u8 = 1;
const PERMISSION_MODERATORS       : u8 = 2;
const PERMISSION_MEMBERS          : u8 = 4;
const PERMISSION_ANYONE           : u8 = 8;

public struct ChatRoomRegistry has key {
    id: UID,
    rooms: vector<ID>
}

public struct ModeratorInfo has store, drop, copy {    
    added_by: address,
    timestamp: u64,
}

public struct BanInfo has store, drop, copy {    
    banned_by: address,
    timestamp: u64,
}

public struct ChatRoom has key, store {
    id: UID,
    name: String,
    owner: address,
    created_at: u64,
    message_count: u64,
    current_block_number: u64,
    image_url: String,    
    banned_users: Table<address, BanInfo>,
    moderators: Table<address, ModeratorInfo>, 
    members: Table<address, ID>,
    max_members: u64,
    room_type: u8,    
    permission_invite: u8,
    permission_send_message: u8
}

#[allow(unused_field)]
public struct RoomKey has store, drop, copy {
    pub_key: vector<u8>,
    iv: vector<u8>,
    encoded_priv_key: vector<u8>
}

public struct MemberInfo has key, store {
    id: UID,
    owner: address,
    added_by: address,
    timestamp: u64,
    room_id: ID,
    room_key: Option<RoomKey> // <- usado apenas em salas privadas
}

public struct MessageBlock has key, store {
    id: UID,
    room_id: ID,
    block_number: u64,
    message_ids: vector<ID>,
    created_at: u64,
    updated_at: u64
}

public struct MessageBlockEvent has copy, drop {
    event_type: String,
    room_id: ID,
    block_number: u64
}

public struct Message has key, store {
    id: UID,
    room_id: ID,
    block_number: u64,
    message_number: u64,
    sender: address,    
    content: String,
    media_url: vector<String>,
    created_at: u64,
    reply_to: Option<ID>,
    edited_at: u64,
    deleted_at: u64
}
 
public struct MessageCreatedEvent has copy, drop {
    message_id: ID,
    room_id: ID,
    sender: address,
}

public struct MessageUpdatedEvent has copy, drop {
    message_id: ID,
    room_id: ID,
    sender: address,
}

public struct MessageDeletedEvent has copy, drop {
    message_id: ID,
    room_id: ID,
    sender: address,
}

public struct ChatRoomCreatedEvent has copy, drop {    
    room_id: ID,    
    owner: address
}

public struct UserBannedEvent has copy, drop {
    room_id: ID,
    user: address,
}

public struct UserUnbannedEvent has copy, drop {
    room_id: ID,
    user: address,
}

fun init(ctx: &mut TxContext) {
    let registry = ChatRoomRegistry {
        id: object::new(ctx),
        rooms: vector::empty()
    };

    transfer::share_object(registry);
}

#[allow(lint(self_transfer))]
public fun create_room(
    profile: &mut UserProfile,
    registry: &mut ChatRoomRegistry,
    name: String,
    image_url: String,
    max_members: u64,
    room_type: u8,
    room_pub_key: vector<u8>,
    room_iv: vector<u8>,
    room_encoded_priv_key: vector<u8>,
    permission_invite: u8,
    permission_send_message: u8,
    clock: &Clock,    
    ctx: &mut TxContext
) {
    assert!(max_members == 0 || max_members > 1, EInvalidMaxMembers);
    assert!(room_type == ROOM_TYPE_PRIVATE_GROUP || room_type == ROOM_TYPE_PUBLIC_GROUP, ENotAuthorized);
    
    let room_uid = object::new(ctx);
    let room_id = room_uid.uid_to_inner();
    let timestamp = clock.timestamp_ms();
    let sender = tx_context::sender(ctx);

    let mut room = ChatRoom {
        id: room_uid,
        name,
        image_url,
        owner: sender,
        created_at: timestamp,
        message_count: 0,
        current_block_number: 0,
        banned_users: table::new(ctx),
        moderators: table::new(ctx),
        members: table::new(ctx),
        max_members,
        room_type: room_type,        
        permission_invite,
        permission_send_message
    };

    let member_info_uid = object::new(ctx);
    let member_info_id = member_info_uid.uid_to_inner();
    let mut member_info = MemberInfo {
        id: member_info_uid,
        owner: sender,
        added_by: sender,
        timestamp,
        room_id,
        room_key: option::none()
    };

    if (room_type == ROOM_TYPE_PRIVATE_GROUP) {
        member_info.room_key = option::some(RoomKey {
            pub_key: room_pub_key,
            iv: room_iv,
            encoded_priv_key: room_encoded_priv_key
        });
    };

    transfer::transfer(member_info, sender);

    user_profile::add_user_profile_rooms_joined(profile, room_id);
    table::add(&mut room.members, sender, member_info_id);

    let first_block = MessageBlock {
        id: object::new(ctx),
        room_id,
        block_number: 0,
        message_ids: vector::empty(),
        created_at: timestamp,
        updated_at: timestamp
    };

    vector::push_back(&mut registry.rooms, room_id);

    df::add(&mut room.id, 0u64, first_block);

    transfer::share_object(room);
    
    event::emit(ChatRoomCreatedEvent {        
        room_id,        
        owner: tx_context::sender(ctx)        
    });
}

#[allow(lint(self_transfer))]
public fun create_dm_room(
    registry: &mut ChatRoomRegistry,
    profile: &mut UserProfile,
    invitee_address: address,
    clock: &Clock,
    ctx: &mut TxContext
) {        
    let sender = tx_context::sender(ctx);
    let room_uid = object::new(ctx);
    let room_id = room_uid.uid_to_inner();
    let timestamp = clock.timestamp_ms();

    let permission_invite: u8 = 0;
    let permission_send_message: u8 = PERMISSION_ADMIN + PERMISSION_MODERATORS + PERMISSION_MEMBERS + PERMISSION_ANYONE;

    let mut room = ChatRoom {
        id: room_uid,
        name: "",
        image_url: "",
        owner: sender,
        created_at: timestamp,
        message_count: 0,
        current_block_number: 0,
        banned_users: table::new(ctx),
        moderators: table::new(ctx),
        members: table::new(ctx),
        max_members: 2,
        room_type: ROOM_TYPE_DM,
        permission_invite,
        permission_send_message
    };

    let invitee_member_info_uid = object::new(ctx);    
    let invitee_member_info_id = invitee_member_info_uid.uid_to_inner();
    let invitee_member_info = MemberInfo {
        id: invitee_member_info_uid,
        owner: invitee_address,
        added_by: sender,
        timestamp,
        room_id,
        room_key: option::none()
    };

    let inviter_member_info_uid = object::new(ctx);    
    let inviter_member_info_id = inviter_member_info_uid.uid_to_inner();
    let inviter_member_info = MemberInfo {
        id: inviter_member_info_uid,
        owner: sender,
        added_by: sender,
        timestamp: 0,
        room_id,
        room_key: option::none()
    };
    
    table::add(&mut room.members, invitee_address, invitee_member_info_id);
    table::add(&mut room.members, sender, inviter_member_info_id);

    transfer::transfer(invitee_member_info, invitee_address);
    transfer::transfer(inviter_member_info, sender); // <- already a owner object

    user_profile::add_user_profile_rooms_joined(profile, room_id);

    let first_block = MessageBlock {
        id: object::new(ctx),
        room_id,
        block_number: 0,
        message_ids: vector::empty(),
        created_at: timestamp,
        updated_at: timestamp
    };

    vector::push_back(&mut registry.rooms, room_id);

    df::add(&mut room.id, 0u64, first_block);
    
    transfer::share_object(room);
    
    event::emit(ChatRoomCreatedEvent {        
        room_id,        
        owner: sender
    });
}

// public fun accept_dm_room(
//     room: &mut ChatRoom,
//     profile: &mut UserProfile,
//     clock: &Clock,
//     ctx: &mut TxContext
// ) {
//     let sender = tx_context::sender(ctx);

//     assert!(room.room_type == ROOM_TYPE_DM, ENotAuthorized);
//     assert!(table::contains(&room.members, sender), ENotAuthorized);
    
//     let room_id = room.id.uid_to_inner();
//     let timestamp = clock.timestamp_ms();
//     let inviter_address = room.owner;

//     let inviter_member_info = table::borrow_mut<address, MemberInfo>(&mut room.members, inviter_address);
//     inviter_member_info.timestamp = timestamp;

//     user_profile::add_user_profile_rooms_joined(profile, room_id);
// }

public fun has_room_permission(
    chat_room: &ChatRoom,
    user_address: address,
    required_permission_flag: u8 // Ex: chat_room.permission_send_message or chat_room.permission_invite
): bool {

    if (required_permission_flag == PERMISSION_NOBODY) {
        return false
    };

    if ((required_permission_flag & PERMISSION_ANYONE) != 0u8) {
        return true
    };

    let is_admin = user_address == chat_room.owner;
    if (is_admin) {
        return true
    };

    let is_moderator = table::contains(&chat_room.moderators, user_address);
    let is_member = table::contains(&chat_room.members, user_address);

    // Lógica Bitwise Principal:
    // Verifica se o grupo do usuário está incluído na lista de permissões requerida.
    if (is_moderator && (required_permission_flag & PERMISSION_MODERATORS) != 0u8) {
        return true
    };

    if (is_member && (required_permission_flag & PERMISSION_MEMBERS) != 0u8) {
        return true
    };

    // Se nenhuma das condições acima for atendida, o usuário não tem a permissão necessária.
    false
}

fun add_message(
    room: &mut ChatRoom,
    content: String,
    reply_to: Option<ID>,
    media_url: vector<String>,
    clock: &Clock,
    ctx: &mut TxContext
) : ID {
    let sender = tx_context::sender(ctx);
    let timestamp = clock.timestamp_ms();
    let room_id = room.id.uid_to_inner();

    let current_block_num = room.current_block_number;
    let current_block_length = df::borrow_mut<u64, MessageBlock>(&mut room.id, current_block_num).message_ids.length();

    if (current_block_length  >= MESSAGES_PER_MESSAGE_BLOCK) {
        let new_block_num = current_block_num + 1;
        let new_block = MessageBlock {
            id: object::new(ctx),
            room_id,
            block_number: new_block_num,
            message_ids: vector::empty(),
            created_at: timestamp,
            updated_at: timestamp
        };

        df::add(&mut room.id, new_block_num, new_block);
        room.current_block_number = new_block_num;

        event::emit(MessageBlockEvent {
            event_type: "created",
            room_id,
            block_number: new_block_num
        });        
    };

    let current_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, room.current_block_number);
    current_block.updated_at = timestamp;

    let message_uid = object::new(ctx);
    let message_id = message_uid.uid_to_inner();

     let message = Message {
        id: message_uid,
        room_id,
        block_number: current_block.block_number,
        message_number: room.message_count,
        sender,        
        content,
        created_at: timestamp,
        reply_to,
        edited_at: 0,
        media_url,
        deleted_at: 0
    };

    transfer::share_object(message);

    vector::push_back(&mut current_block.message_ids, message_id);
    room.message_count = room.message_count + 1;

    message_id
}

#[allow(lint(self_transfer))]
public fun send_message(
    profile: &mut UserProfile,
    room: &mut ChatRoom,
    content: String,
    reply_to: Option<ID>,
    media_url: vector<String>,
    clock: &Clock,
    ctx: &mut TxContext
): ID {
    let sender = tx_context::sender(ctx);

    assert!(!table::contains(&room.banned_users, sender), EUserBanned);
    assert!(!string::is_empty(&content) || !vector::is_empty(&media_url), EEmptyMessage);
    assert!(has_room_permission(room, sender, room.permission_send_message), ENotAuthorizedToSendMessage);

    let timestamp = clock.timestamp_ms();
    let room_id = room.id.uid_to_inner();

    // só para public faz sentido adicionar o usuário automaticamente como membro (pois não precisa de room_key própria)
    // se DM, o usuário já faz parte de members
    // se private, não faz sentido adicionar o usuário automaticamente
    if (room.room_type == ROOM_TYPE_PUBLIC_GROUP && !table::contains(&room.members, sender)) { 
        assert!(room.max_members == 0 || room.max_members >= table::length(&room.members) + 1, EMaxRoomMembersLimit);

        let member_info_uid = object::new(ctx);
        let member_info_id = member_info_uid.uid_to_inner();
        let member_info = MemberInfo {
            id: member_info_uid,
            owner: sender,
            added_by: sender,
            timestamp: timestamp,
            room_id: room_id,
            room_key: option::none()
        };
        table::add(&mut room.members, sender, member_info_id);
        transfer::transfer(member_info, sender);
    };
    
    let message_id = add_message(room, content, reply_to, media_url, clock, ctx);
    
    user_profile::add_user_profile_rooms_joined(profile, room_id);    

    event::emit(MessageCreatedEvent {        
        message_id,
        room_id,
        sender,
    });

    message_id
}

public fun edit_message(
    room: &mut ChatRoom,    
    message: &mut Message,
    new_content: String,
    new_media_url: vector<String>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(message.sender == sender, ENotAuthorized);
    assert!(!string::is_empty(&new_content) || vector::length(&new_media_url) > 0, EEmptyMessage);    

    let timestamp = clock.timestamp_ms();

    message.content = new_content;
    message.edited_at = timestamp;
    message.media_url = new_media_url;

    let message_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, message.block_number);
    message_block.updated_at = timestamp;

    event::emit(MessageUpdatedEvent {        
        message_id: message.id.to_inner(),
        room_id: message.room_id,
        sender: tx_context::sender(ctx)
    });
}

public fun delete_message(
    room: &mut ChatRoom,
    message: &mut Message,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(message.deleted_at == 0, ENotAuthorized);

    if (room.room_type == ROOM_TYPE_DM) {
        assert!(message.sender == sender, ENotAuthorized);
    } else {
        let is_authorized = message.sender == sender || 
                            room.owner == sender ||
                            table::contains(&room.moderators, sender);
        assert!(is_authorized, ENotAuthorized);
    };

    let message_id = message.id.uid_to_inner();    
    let room_id = message.room_id;
    let timestamp = clock.timestamp_ms();

    let message_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, message.block_number);
    message_block.updated_at = timestamp;

    //let Message { id, .. } = message;
    // object::delete(id);
    message.content = "";
    message.media_url = vector::empty();
    message.deleted_at = timestamp;

    event::emit(MessageDeletedEvent {
        message_id,
        room_id,
        sender
    });
}

public fun invite_member(
    room: &mut ChatRoom,
    profile: &mut UserProfile,
    invitee_address: address,
    room_pub_key: &mut Option<vector<u8>>,
    room_iv: &mut Option<vector<u8>>,
    room_encoded_priv_key: &mut Option<vector<u8>>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    
    assert!(has_room_permission(room, sender, room.permission_invite), ENotAuthorizedToInvite);

    if (!table::contains(&room.members, invitee_address)) {
        assert!(room.max_members == 0 || room.max_members >= table::length(&room.members) + 1, EMaxRoomMembersLimit);

        let member_info: MemberInfo;
        let member_info_uid = object::new(ctx);
        let member_info_id = member_info_uid.uid_to_inner();

        if (room.room_type == ROOM_TYPE_PUBLIC_GROUP) {
            member_info = MemberInfo {
                id: member_info_uid,
                owner: invitee_address,
                added_by: sender,
                timestamp: clock.timestamp_ms(),
                room_id: room.id.uid_to_inner(),
                room_key: option::none()
            };
        } else {
            let pub_key = option::extract(room_pub_key);
            let iv = option::extract(room_iv);
            let encoded_priv_key = option::extract(room_encoded_priv_key);

            member_info = MemberInfo {
                id: member_info_uid,
                owner: invitee_address,
                added_by: sender,
                timestamp: clock.timestamp_ms(),
                room_id: room.id.uid_to_inner(),
                room_key: option::some(RoomKey {
                    pub_key: pub_key,
                    iv: iv,
                    encoded_priv_key: encoded_priv_key
                })
            };
        };

        if (sender == invitee_address) {
            user_profile::add_user_profile_rooms_joined(profile, room.id.uid_to_inner());
        };

        table::add(&mut room.members, invitee_address, member_info_id);
        transfer::transfer(member_info, invitee_address);
    };
}

public fun add_moderator(
    room: &mut ChatRoom,
    moderator: address,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(room.room_type != ROOM_TYPE_DM, ENotAuthorized);
    assert!(table::contains(&room.members, moderator), ENotAuthorized);

    let sender = tx_context::sender(ctx);
    assert!(room.owner == sender, ENotAuthorized);

    if (!table::contains(&room.moderators, moderator)) {
        let timestamp = clock.timestamp_ms();
        let info = ModeratorInfo {
            added_by: sender,
            timestamp: timestamp
        };
        table::add(&mut room.moderators, moderator, info);
    };
}

public fun remove_moderator(
    room: &mut ChatRoom,
    moderator: address,
    ctx: &mut TxContext
) {
    assert!(room.room_type != ROOM_TYPE_DM, ENotAuthorized);
    assert!(table::contains(&room.members, moderator), ENotAuthorized);
    assert!(table::contains(&room.moderators, moderator), ENotAuthorized);

    let sender = tx_context::sender(ctx);
    assert!(room.owner == sender, ENotAuthorized);

    if (table::contains(&room.moderators, moderator)) {
        table::remove(&mut room.moderators, moderator);
    };
}

public fun ban_user(
    room: &mut ChatRoom,
    user: address,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(room.room_type != ROOM_TYPE_DM, ENotAuthorized);
    assert!(user != room.owner, ENotAuthorized);
    assert!(!table::contains(&room.moderators, user), ENotAuthorized);
    assert!(table::contains(&room.members, user), ENotAuthorized);

    let sender = tx_context::sender(ctx);
    let is_authorized = room.owner == sender || 
                        table::contains(&room.moderators, sender);
    
    assert!(is_authorized, ENotAuthorized);    

    if (!table::contains(&room.banned_users, user)) {
        let info = BanInfo {
            banned_by: sender,
            timestamp: clock.timestamp_ms()
        };
        table::add(&mut room.banned_users, user, info);
        
        event::emit(UserBannedEvent {
            room_id: object::uid_to_inner(&room.id),
            user,
        });
    };
}

/// Desbanir usuário
public fun unban_user(
    room: &mut ChatRoom,
    user: address,
    ctx: &mut TxContext
) {
    assert!(room.room_type != ROOM_TYPE_DM, ENotAuthorized);
    assert!(table::contains(&room.members, user), ENotAuthorized);

    let sender = tx_context::sender(ctx);
    let is_authorized = room.owner == sender || 
                        table::contains(&room.moderators, sender);

    assert!(is_authorized, ENotAuthorized);

    if (table::contains(&room.banned_users, user)) {
        table::remove(&mut room.banned_users, user);

        event::emit(UserUnbannedEvent {            
            room_id: object::uid_to_inner(&room.id),
            user,
        });
    };    
}