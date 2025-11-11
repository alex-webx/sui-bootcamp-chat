module chat::chat_room;

use std::string::{Self, String};
use sui::event;
use sui::clock::Clock;
use chat::user_profile::{Self, UserProfile};
use sui::dynamic_field as df;

const EUserBanned       : u64 = 001;
const ENotAuthorized    : u64 = 002;
const EEmptyMessage     : u64 = 003;

const MESSAGES_PER_MESSAGE_BLOCK: u64 = 100;

public struct ChatRoomRegistry has key {
    id: UID,
    rooms: vector<ID>
}

public struct ChatRoomAdminCap has key, store {
    id: UID,
    room_id: ID,
}

public struct ChatRoom has key, store {
    id: UID,
    name: String,
    owner: address,
    created_at: u64,
    message_count: u64,
    current_block_number: u64,
    image_url: String,
    banned_users: vector<address>,
    moderators: vector<address>
}

public struct MessageBlock has key, store {
    id: UID,
    room_id: ID,
    block_number: u64,
    message_ids: vector<ID>,
    created_at: u64
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
    created_at: u64,
    reply_to: Option<ID>,
    edited: bool,
    edit_capability_id: ID,
}

 public struct MessageEditCap has key, store {
    id: UID,
    message_id: ID,
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
    clock: &Clock,
    ctx: &mut TxContext
) {
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
        banned_users: vector::empty(),
        moderators: vector::empty()
    };

    let first_block = MessageBlock {
        id: object::new(ctx),
        room_id,
        block_number: 0,
        message_ids: vector::empty(),
        created_at: timestamp
    };

    vector::push_back(&mut registry.rooms, room_id);

    let admin_cap = ChatRoomAdminCap {
        id: object::new(ctx),
        room_id
    };

    df::add(&mut room.id, 0u64, first_block);

    user_profile::add_user_profile_rooms_joined(profile, room_id);

    transfer::share_object(room);
    transfer::transfer(admin_cap, sender);

    event::emit(ChatRoomCreatedEvent {        
        room_id,        
        owner: tx_context::sender(ctx)        
    });
}

#[allow(lint(self_transfer))]
public fun send_message(
    profile: &mut UserProfile,
    room: &mut ChatRoom,
    content: String,
    reply_to: Option<ID>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(!vector::contains(&room.banned_users, &sender), EUserBanned);
    assert!(!string::is_empty(&content), EEmptyMessage);

    let timestamp = clock.timestamp_ms();
    let room_id = room.id.uid_to_inner();
    let current_block_num = room.current_block_number;
    
    let mut current_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, current_block_num);

    if (vector::length(&current_block.message_ids) >= MESSAGES_PER_MESSAGE_BLOCK) {
        let new_block_num = current_block_num + 1;
        let new_block = MessageBlock {
            id: object::new(ctx),
            room_id,
            block_number: new_block_num,
            message_ids: vector::empty(),
            created_at: timestamp
        };

        df::add(&mut room.id, new_block_num, new_block);
        room.current_block_number = new_block_num;

        event::emit(MessageBlockEvent {
            event_type: "created",
            room_id,
            block_number: new_block_num
        });

        current_block = df::borrow_mut<u64, MessageBlock>(&mut room.id, new_block_num);
    };
    
    let message_uid = object::new(ctx);
    let message_id = message_uid.uid_to_inner();
    let edit_capability_uid = object::new(ctx);
    let edit_capability_id = edit_capability_uid.uid_to_inner();

    let edit_cap = MessageEditCap {
        id: edit_capability_uid,
        message_id
    };
    
    let message = Message {
        id: message_uid,
        room_id,
        block_number: current_block.block_number,
        message_number: room.message_count,
        sender,        
        content,
        created_at: timestamp,
        reply_to,
        edited: false,
        edit_capability_id
    };

    vector::push_back(&mut current_block.message_ids, message_id);
    room.message_count = room.message_count + 1;

    user_profile::add_user_profile_rooms_joined(profile, room_id);

    event::emit(MessageCreatedEvent {        
        message_id,
        room_id,
        sender,
    });

    transfer::share_object(message);
    transfer::transfer(edit_cap, sender);
}

public fun edit_message(
    _edit_cap: &MessageEditCap,
    message: &mut Message,
    new_content: String,
    ctx: &mut TxContext
) {
    assert!(!string::is_empty(&new_content), EEmptyMessage);

    message.content = new_content;
    message.edited = true;

    event::emit(MessageUpdatedEvent {        
        message_id: message.id.to_inner(),
        room_id: message.room_id,
        sender: tx_context::sender(ctx)
    });
}

public fun delete_message(
    room: &ChatRoom,
    message: Message,
    messageEditCap: MessageEditCap,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    let is_authorized = message.sender == sender || 
                        room.owner == sender ||
                        vector::contains(&room.moderators, &sender);
    
    assert!(is_authorized, ENotAuthorized);

    let message_id = message.id.uid_to_inner();    
    let room_id = message.room_id;

    let Message { 
        id, 
        room_id: _, 
        block_number: _,
        message_number: _,
        sender: _,         
        content: _, 
        created_at: _, 
        reply_to: _,
        edited: _,
        edit_capability_id: _
    } = message;
    
    object::delete(id);

    let MessageEditCap {
        id: messageEditCapId,
        message_id: _
    } = messageEditCap;

    object::delete(messageEditCapId);

    event::emit(MessageDeletedEvent {
        message_id,
        room_id,
        sender
    });
}

public fun add_moderator(
    _admin_cap: &ChatRoomAdminCap,
    room: &mut ChatRoom,
    moderator: address,
    ctx: &mut TxContext
) {
    assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);
    
    if (!vector::contains(&room.moderators, &moderator)) {
        vector::push_back(&mut room.moderators, moderator);
    };
}

public fun ban_user(
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
        });
    };
}

/// Desbanir usuário
public fun unban_user(
    _admin_cap: &ChatRoomAdminCap,
    room: &mut ChatRoom,
    user: address,
    ctx: &mut TxContext
) {
    assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);
    
    let (contains, index) = vector::index_of(&room.banned_users, &user);
    if (contains) {
        vector::remove(&mut room.banned_users, index);

        event::emit(UserUnbannedEvent {            
            room_id: object::uid_to_inner(&room.id),
            user,
        });
    };
}