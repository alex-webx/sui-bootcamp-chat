module sui_chat::chat_room;

use std::string::String;
//use sui::table::Table;
use sui::clock::{Self, Clock};
use sui::dynamic_field as field;
use sui_chat::user_profile;
use sui_chat::user_profile::UserProfile;

// #[error] const EEditMessageNoOwner:          vector<u8> = b"User can't edit the message: user is not the owner!";
// #[error] const EDeleteMessageNotOwner:       vector<u8> = b"User can't delete the message: user not the owner!";
// #[error] const EDeleteMessageInvalidMessage: vector<u8> = b"Message not found";

public struct ChatRoomRegistry has key {
    id: UID,
    rooms: vector<ID>    
}

public struct RoomAdminCap has key, store {
    id: UID,
    room_id: ID,
}

public struct ChatRoom has key, store {
    id: UID,
    name: String,
    owner: address,
    current_block_number: u64,
    created_at: u64,
    message_count: u64
}

public struct MessageBlock has key, store {
    id: UID,
    room_id: ID,
    block_number: u64,
    message_ids: vector<ID>,
    created_at: u64
}

public struct Message has key, store {
    id: UID,
    room_id: ID,
    block_number: u64,
    message_number: u64,
    sender: address,
    username: String,
    content: String,
    timestamp: u64
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
    registry: &mut ChatRoomRegistry,
    name: String,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let room_uid = object::new(ctx);
    let room_id = room_uid.uid_to_inner();
    let timestamp = clock.timestamp_ms();

    let mut room = ChatRoom {
        id: room_uid,
        name,
        owner: tx_context::sender(ctx),
        created_at: timestamp,
        current_block_number: 0,
        message_count: 0
    };

    let first_block = MessageBlock {
        id: object::new(ctx),
        room_id,
        block_number: 0,
        message_ids: vector::empty(),
        created_at: timestamp
    };

    vector::push_back(&mut registry.rooms, room_id);

    let admin_cap = RoomAdminCap {
        id: object::new(ctx),
        room_id
    };

    field::add(&mut room.id, 0u64, first_block);

    transfer::share_object(room);    
    transfer::transfer(admin_cap, tx_context::sender(ctx));
}

public fun send_message(
    profile: &mut UserProfile,
    room: &mut ChatRoom,
    content: String,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    let timestamp = clock::timestamp_ms(clock);
    let room_id = room.id.to_inner();
    let current_block_num = room.current_block_number;
    let mut current_block = field::borrow_mut<u64, MessageBlock>(&mut room.id, current_block_num);

    if (vector::length(&current_block.message_ids) >= 100) {
        let new_block_num = current_block_num + 1;
        let new_block = MessageBlock {
            id: object::new(ctx),
            room_id,
            block_number: new_block_num,
            message_ids: vector::empty(),
            created_at: timestamp
        };

        field::add(&mut room.id, new_block_num, new_block);
        room.current_block_number = new_block_num;

        current_block = field::borrow_mut<u64, MessageBlock>(&mut room.id, new_block_num);
    };
    
    let message_uid = object::new(ctx);
    let message_id = message_uid.uid_to_inner();

    let (name) = user_profile::get_user_profile_info(profile);

    let message = Message {
        id: message_uid,
        room_id,
        block_number: current_block.block_number,
        message_number: room.message_count,
        sender,
        username: name,
        content,
        timestamp,
    };

    vector::push_back(&mut current_block.message_ids, message_id);
    room.message_count = room.message_count + 1;
    
    transfer::share_object(message);
}

// public fun edit_message(message: &mut Message, new_content: String, ctx: &mut TxContext) {
//     let sender = tx_context::sender(ctx);
//     assert!(sender == message.sender, EEditMessageNoOwner);
//     message.content = new_content;
// }

// public fun delete_message(chat: &mut ChatRoom, message: Message, ctx: &mut TxContext) {
//     let sender = tx_context::sender(ctx);
//     assert!(sender == message.sender, EDeleteMessageNotOwner);

//     let mut found = false;
//     let mut index = 0;
//     let len = vector::length(&chat.messages);

//     let Message { id: message_id, sender: _, content: _, timestamp: _ } = message;

//     while (index < len) {
//         let current_message_id = vector::borrow(&chat.messages, index);
//         if (current_message_id == &message_id.to_inner()) {
//             found = true;
//             break
//         };

//         index = index + 1;
//     };

//     assert!(found, EDeleteMessageInvalidMessage);
//     vector::remove(&mut chat.messages, index);

//     object::delete(message_id);
// }