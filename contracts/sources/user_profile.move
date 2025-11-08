module sui_chat::user_profile;

use std::string::String;

const ERR_UPDATE_PROFILE_NOT_OWNER: u64 = 001;
const ERR_DELETE_PROFILE_NOT_OWNER: u64 = 010;

public struct UserProfile has key {
    id: UID,
    owner: address,
    name: String,
    avatar_url: String
}

public fun create_user_profile(name: String, avatar_url: String, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    let profile = UserProfile {
        id: object::new(ctx),
        owner: sender,
        name,
        avatar_url,
    };
    transfer::transfer(profile, sender);
}

public fun update_profile(profile: &mut UserProfile, new_name: String, new_avatar_url: String, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(profile.owner == sender, ERR_UPDATE_PROFILE_NOT_OWNER);
    profile.name = new_name;
    profile.avatar_url = new_avatar_url;
}

public fun delete_profile(profile: UserProfile, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(profile.owner == sender, ERR_DELETE_PROFILE_NOT_OWNER);
    let UserProfile { id: profile_id, owner: _, name: _, avatar_url: _ } = profile;
    object::delete(profile_id);
}

public fun get_user_profile_info(profile: &UserProfile): (String) {
    (profile.name)
}