module chat::user_profile;

use std::string::{Self, String};
use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

const EUserNotOwnerOfUserProfile    : u64 = 001;
const EUserProfileAlreadyExists     : u64 = 002;
const EUserProfileNotExists         : u64 = 003;
const EEmptyString                  : u64 = 004;
const EEmptyVector                  : u64 = 005;

public struct UserProfileRegistry has key {
    id: UID,
    users: Table<address, ID>, // mapping wallet address -> profile id
}

public struct UserProfile has key {
    id: UID,
    owner: address,
    username: String,
    avatar_url: String,
    updated_at: u64,
    created_at: u64,
    rooms_joined: vector<ID>,
    key_pub: vector<u8>,
    key_priv_derived: vector<u8>,
    key_iv: vector<u8>,
    key_salt: vector<u8>,
}

public struct UserProfileCreatedEvent has copy, drop {
    owner: address,
    profile_id: ID   
}
public struct UserProfileUpdatedEvent has copy, drop {
    owner: address,
    profile_id: ID   
}
public struct UserProfileDeletedEvent has copy, drop {
    owner: address,
    profile_id: ID   
}

fun init(ctx: &mut TxContext) {
    let user_registry = UserProfileRegistry {
        id: object::new(ctx),
        users: table::new(ctx),
    };
    transfer::share_object(user_registry);
}

public fun create_user_profile(
    user_profile_registry: &mut UserProfileRegistry,
    username: String, 
    avatar_url: String, 
    key_pub: vector<u8>,
    key_priv_derived: vector<u8>,
    key_iv: vector<u8>,
    key_salt: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(!table::contains(&user_profile_registry.users, sender), EUserProfileAlreadyExists);
    assert!(!string::is_empty(&username), EEmptyString);
    assert!(vector::length(&key_pub) > 0, EEmptyVector);
    assert!(vector::length(&key_priv_derived) > 0, EEmptyVector);
    assert!(vector::length(&key_iv) > 0, EEmptyVector);
    assert!(vector::length(&key_salt) > 0, EEmptyVector);

    let profile_uid = object::new(ctx);
    let profile_id = profile_uid.uid_to_inner();
    let timestamp = clock.timestamp_ms();

    let profile = UserProfile {
        id: profile_uid,
        owner: sender,
        username,
        avatar_url,
        created_at: timestamp,
        updated_at: timestamp,
        rooms_joined: vector::empty(),
        key_pub,
        key_priv_derived,
        key_iv,
        key_salt,
    };

    table::add(&mut user_profile_registry.users, sender, profile_id);

    transfer::transfer(profile, sender);

    event::emit(UserProfileCreatedEvent {        
        profile_id,
        owner: sender        
    });
}

public fun update_user_profile(
    profile: &mut UserProfile, 
    new_username: String, 
    new_avatar_url: String, 
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    assert!(profile.owner == sender, EUserNotOwnerOfUserProfile);
    assert!(!string::is_empty(&new_username), EEmptyString);

    let timestamp = clock.timestamp_ms();

    profile.username = new_username;
    profile.avatar_url = new_avatar_url;
    profile.updated_at = timestamp;

    event::emit(UserProfileUpdatedEvent {        
        profile_id: profile.id.to_inner(),
        owner: sender        
    });
}

public fun delete_user_profile(
    user_profile_registry: &mut UserProfileRegistry,
    profile: UserProfile, 
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(profile.owner == sender, EUserNotOwnerOfUserProfile);
    assert!(table::contains(&user_profile_registry.users, sender), EUserProfileNotExists);

    let UserProfile { id: profile_uid, .. } = profile;

    let profile_id = profile_uid.to_inner();
    
    table::remove(&mut user_profile_registry.users, sender);
    object::delete(profile_uid);

    event::emit(UserProfileDeletedEvent {        
        profile_id,
        owner: sender        
    });
}

public fun add_user_profile_rooms_joined(profile: &mut UserProfile, room_id: ID) {
    if (!vector::contains(&profile.rooms_joined, &room_id)) {
        vector::push_back(&mut profile.rooms_joined, room_id);
    }
}

public fun get_user_profile_username(profile: &UserProfile): String {
    profile.username
}

public fun get_user_profile_rooms_joined(profile: &UserProfile): vector<ID> {
    profile.rooms_joined
}

public fun get_user_profile_key_pub(profile: &UserProfile): vector<u8> {
    profile.key_pub
}
