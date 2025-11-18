const fs = require('fs');
const { execSync } = require('child_process');
const { 
  PackageId, 
  UserProfileRegistryId, 
  ChatRoomRegistryId
} = JSON.parse(fs.readFileSync('./.move.devnet.json').toString());
const userProfilesConfig = JSON.parse(fs.readFileSync('./data/userProfiles.json').toString()); // <-- [{ alias, address, signature, username, avatarUrl, keys { keyPub, keyPrivDerived, keyIv, keySalt } }]
const activeEnv = execSync('sui client active-env').toString().trim();
const addresses = JSON.parse(execSync('sui client addresses --json').toString().trim()).addresses;

for (let upc of userProfilesConfig) {
  setActiveAddress(upc.alias);
  console.log(upc.alias + " => " + getActiveAddress());

  const keys = {
    keyPub: '0x' + Buffer.from(upc.keys.keyPub, 'base64').toString('hex'),
    keyPrivDerived: '0x' + Buffer.from(upc.keys.keyPrivDerived, 'base64').toString('hex'),
    keyIv: '0x' + Buffer.from(upc.keys.keyIv, 'base64').toString('hex'),
    keySalt: '0x' + Buffer.from(upc.keys.keySalt, 'base64').toString('hex')
  };
  const profile = clientCall(JSON.stringify('user_profile'), JSON.stringify('create_user_profile'), UserProfileRegistryId, JSON.stringify(upc.username), JSON.stringify(upc.avatarUrl), keys.keyPub, keys.keyPrivDerived, keys.keyIv, keys.keySalt, '0x6');
}

function clientCall(module, fun, ...args) {
  let _args = args.map(arg => '--args ' + arg).join(' ');
  const command = `sui client call --package ${PackageId} --module ${module} --function ${fun} ${args.length ? _args : '' } --json`;
  console.log(command);
  return JSON.parse(execSync(command).toString())
}
function getActiveAddress() { return execSync('sui client active-address').toString().trim(); }
function setActiveAddress(addressAlias) { execSync(`sui client switch --address ${JSON.stringify(addressAlias)}`).toString().trim(); }
