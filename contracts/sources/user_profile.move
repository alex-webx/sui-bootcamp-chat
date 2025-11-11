module chat::user_profile;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

const EUserNotOwnerOfUserProfile    : u64 = 001;
const EUserProfileAlreadyExists     : u64 = 002;
const EUserProfileNotExists         : u64 = 003;

public struct UserProfile has key {
    id: UID,
    owner: address,
    username: String,
    avatar_url: String,
    updated_at: u64,
    created_at: u64,
    rooms_joined: vector<ID>
}

public struct UserProfileRegistry has key {
    id: UID,
    users: Table<address, ID>, // mapping wallet address -> profile id
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
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);

    assert!(!table::contains(&user_profile_registry.users, sender), EUserProfileAlreadyExists);

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
        rooms_joined: vector::empty()
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

    let UserProfile { 
        id: profile_uid, 
        owner: _, 
        username: _, 
        avatar_url: _,
        created_at: _,
        updated_at: _,
        rooms_joined: _
    } = profile;

    let profile_id = profile_uid.to_inner();
    
    table::remove(&mut user_profile_registry.users, sender);
    object::delete(profile_uid);

    event::emit(UserProfileDeletedEvent {        
        profile_id,
        owner: sender        
    });
}

public (package) fun add_user_profile_rooms_joined(profile: &mut UserProfile, room_id: ID) {
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