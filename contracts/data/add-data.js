const fs = require('fs');
const { execSync } = require('child_process');

const { 
  PackageId: PACKAGE_ID, 
  UserProfileRegistryId: USER_PROFILE_REGISTRY_ID, 
  ChatRoomRegistryId: CHAT_ROOM_REGISTRY_ID
} = require('../.move.devnet.json');
const CLOCK_ID = '0x6';

const userProfilesConfig = require('./userProfiles.json'); // <-- [{ alias, address, signature, username, avatarUrl, keys { keyPub, keyPrivDerived, keyIv, keySalt } }]
const activeEnv = execSync('sui client active-env').toString().trim();
const addresses = JSON.parse(execSync('sui client addresses --json').toString().trim()).addresses;

addUserProfiles();
createDmRoom();

function createDmRoom() {
  const pairs = getAllPairs(userProfilesConfig);
  
  const dmPairs = pickRandom(pairs, 10);
  
  for (let dmPair of dmPairs) {
    const resProfile1 = JSON.parse(execSync(`sui client objects ${dmPair[0].address} --json`).toString());
    const profile1 = resProfile1.find(obj => obj.data.type === `${PACKAGE_ID}::user_profile::UserProfile`).data;

    // const resProfile2 = JSON.parse(execSync(`sui client objects ${dmPair[1].address} --json`).toString());
    // const profile2 = resProfile2.find(obj => obj.data.type === `${PACKAGE_ID}::user_profile::UserProfile`);
    setActiveAddress(dmPair[0].alias);

    const dmRoom = clientCall(
      JSON.stringify('chat_room'),
      JSON.stringify('create_dm_room'),
      CHAT_ROOM_REGISTRY_ID,
      profile1.objectId,
      dmPair[1].address,
      CLOCK_ID
    );
  }
}
    
function addUserProfiles() {
  for (let upc of userProfilesConfig) {
    setActiveAddress(upc.alias);
    console.log(upc.alias + " => " + getActiveAddress());

    const keys = {
      keyPub: '0x' + Buffer.from(upc.keys.keyPub, 'base64').toString('hex'),
      keyPrivDerived: '0x' + Buffer.from(upc.keys.keyPrivDerived, 'base64').toString('hex'),
      keyIv: '0x' + Buffer.from(upc.keys.keyIv, 'base64').toString('hex'),
      keySalt: '0x' + Buffer.from(upc.keys.keySalt, 'base64').toString('hex')
    };

    const profile = clientCall(
      JSON.stringify('user_profile'), 
      JSON.stringify('create_user_profile'), 
      USER_PROFILE_REGISTRY_ID, 
      JSON.stringify(upc.username), 
      JSON.stringify(upc.avatarUrl), 
      keys.keyPub, 
      keys.keyPrivDerived, 
      keys.keyIv, 
      keys.keySalt, 
      CLOCK_ID
    );
  }
}
function clientCall(module, fun, ...args) {
  let _args = args.map(arg => '--args ' + arg).join(' ');
  const command = `sui client call --package ${PACKAGE_ID} --module ${module} --function ${fun} ${args.length ? _args : '' } --json`;
  console.log(command);
  return JSON.parse(execSync(command).toString())
}
function getActiveAddress() { return execSync('sui client active-address').toString().trim(); }
function setActiveAddress(addressAlias) { execSync(`sui client switch --address ${JSON.stringify(addressAlias)}`).toString().trim(); }

function getAllPairs(arr) {
  const allPairs = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      allPairs.push([arr[i], arr[j]]);
    }
  }
  return allPairs;
}
function pickRandom(array, size) {
  if (size >= array.length) {
    console.warn("A size solicitada é maior ou igual ao tamanho do array. Retornando o array inteiro embaralhado.");
    return shuffleArray(array);
  }  
  return shuffleArray(array).slice(0, size);
}
function shuffleArray(array) {
  const shuffledArray = [...array];
  let counter = shuffledArray.length;
  let temp, randomIndex;
  while (counter > 0) {
    randomIndex = Math.floor(Math.random() * counter);
    counter--;
    temp = shuffledArray[counter];
    shuffledArray[counter] = shuffledArray[randomIndex];
    shuffledArray[randomIndex] = temp;
  }
  return shuffledArray;
}