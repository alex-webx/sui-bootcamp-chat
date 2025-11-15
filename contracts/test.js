let { PackageId, UserProfileRegistryId, ChatRoomRegistryId } = require('./.move.devnet.json');
let Clock = '0x6';

function mountCall(module, functionName, args) {
    let call = `sui client call --package ${PackageId} --module ${module} --function ${functionName}`;
    if (args?.length) {
        call += ` --args ${args.join(' ')}`;
    }
    return call;
}

function mountDynamicFieldCall(parentId, fieldname, typeField) {
    let call = `sui client dynamic_field ${parentId} ${fieldname} --type ${typeField}`;
    return call;
}

console.log(mountCall('user_profile', 'create_user_profile', [ UserProfileRegistryId, '"Alexandre S."', '"https://todo"', '"pub_key_value"', '"priv_key_value"', Clock ]))


