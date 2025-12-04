import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import config from '../.move.devnet.json' with { type: 'json' };
import profilesConfig from './userProfiles.json' with { type: 'json' };
import { execSync }  from 'child_process';

const {
  PackageId: PACKAGE_ID, 
  UserProfileRegistryId: USER_PROFILE_REGISTRY_ID, 
  ChatRoomRegistryId: CHAT_ROOM_REGISTRY_ID,  
} = config;

// const activeEnv = execSync('sui client active-env').toString().trim();
// const addresses = JSON.parse(execSync('sui client addresses --json').toString().trim()).addresses;
const client = new SuiClient({ network: 'devnet', url: getFullnodeUrl('devnet') });
const profiles = profilesConfig.reduce((acc, prof) => { acc[prof.address] = prof; return acc;}, {}); 

extractPrivateKeys();
await addUserProfiles();
await createPublicRooms();
await createDmRoom();
await sendMessages();

console.log(profiles);

function extractPrivateKeys () {
  for (let profile of Object.values(profiles)) {  
    const privateKey = JSON.parse(execSync(`sui keytool export --key-identity ${profile.address} --json`).toString()).exportedPrivateKey;    
    profile.privateKey = Ed25519Keypair.fromSecretKey(privateKey);
  }
}
  
async function addUserProfiles() {  
  for (let profile of Object.values(profiles)) {

    console.log(`- Adding profile for ${profile.username}`);

    const objs = await client.getOwnedObjects({ owner: profile.address, filter: { StructType: `${PACKAGE_ID}::user_profile::UserProfile`} });
    if (objs.data[0]) {
      profile.profileId = objs.data[0].data.objectId;
      continue;
    }

    const keys = {
      keyPub: Buffer.from(profile.keys.keyPub, 'base64'),
      keyPrivDerived: Buffer.from(profile.keys.keyPrivDerived, 'base64'),
      keyIv: Buffer.from(profile.keys.keyIv, 'base64'),
      keySalt: Buffer.from(profile.keys.keySalt, 'base64'),
    };

    const tx = new Transaction();
    tx.setSender(profile.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::user_profile::create_user_profile`,
      arguments: [
        tx.object(USER_PROFILE_REGISTRY_ID),
        tx.pure.string(profile.username),
        tx.pure.string(profile.avatarUrl),
        tx.pure.vector('u8', keys.keyPub), 
        tx.pure.vector('u8', keys.keyPrivDerived), 
        tx.pure.vector('u8', keys.keyIv), 
        tx.pure.vector('u8', keys.keySalt), 
        tx.object(SUI_CLOCK_OBJECT_ID)
      ]
    })

    profile.profileId = (await signTransaction(profile.privateKey, tx)).objectChanges.find(change => change.type === 'created' && change.objectType === `${PACKAGE_ID}::user_profile::UserProfile`).objectId;
  }

  return profiles;
}

async function createDmRoom() {
  const pairs = getAllPairs(Object.values(profiles));
  const dmPairs = pickRandom(pairs, 10);

  for (let dmPair of dmPairs) {    
    
    console.log(`- Creating DM room for ${dmPair[0].username} and ${dmPair[1].username}`);

    const tx = new Transaction();
    tx.setSender(dmPair[0].address);
    tx.moveCall({
      target: `${PACKAGE_ID}::chat_room::create_dm_room`,
      arguments: [
        tx.object(CHAT_ROOM_REGISTRY_ID),
        tx.object(dmPair[0].profileId),
        tx.pure.address(dmPair[1].address),
        tx.object(SUI_CLOCK_OBJECT_ID)
      ]
    });

    const dmRoomId = (await signTransaction(dmPair[0].privateKey, tx)).objectChanges.find(change => change.type === 'created' && change.objectType === `${PACKAGE_ID}::chat_room::ChatRoom`).objectId;
    
    dmPair[0].dmRoomsIds = dmPair[0].dmRoomsIds || [];
    dmPair[1].dmRoomsIds = dmPair[1].dmRoomsIds || [];

    dmPair[0].dmRoomsIds.push(dmRoomId);
    dmPair[1].dmRoomsIds.push(dmRoomId);
  }
}

async function createPublicRooms() {
  console.log(`- Creating public rooms`);

  const rooms = [{
    name: 'Canal Brasil - Comunicados',
    imageUrl: 'https://st2.depositphotos.com/5698376/8435/v/450/depositphotos_84356880-stock-illustration-flag-of-brazil-in-gold.jpg',
    maxMembers: 0,
    permissionInvite: 1 + 2 + 4 + 8,
    permissionSendMessage: 1 + 2 
  }, {
    name: 'Canal Memelândia - Público',
    imageUrl: 'https://midias.correiobraziliense.com.br/_midias/jpg/2022/11/28/fiqckalwaagsy7w-26935374.jfif',
    maxMembers: 0,
    permissionInvite: 1 + 2 + 4 + 8,
    permissionSendMessage: 1 + 2 + 4 + 8 
  }, {
    name: 'Canal TOP 5 FCFS',
    imageUrl: 'https://i0.wp.com/fedefutsal.com/wp-content/uploads/2024/06/fedefutsal.png?resize=1024%2C1024&ssl=1',
    maxMembers: 5,
    permissionInvite: 1 + 2 + 4 + 8,
    permissionSendMessage: 1 + 2 + 4 + 8
  }];

  const profileOwner = Object.values(profiles)[0];

  let tx = new Transaction();
  tx.setSender(profileOwner.address);

  for (let room of rooms) {    
    tx.moveCall({
      target: `${PACKAGE_ID}::chat_room::create_room`,
      arguments: [
        tx.object(profileOwner.profileId),
        tx.object(CHAT_ROOM_REGISTRY_ID),
        tx.pure.string(room.name),
        tx.pure.string(room.imageUrl),
        tx.pure.u64(room.maxMembers),
        tx.pure.u8(2),
        tx.pure.option('vector<u8>', null),
        tx.pure.option('vector<u8>', null),
        tx.pure.option('vector<u8>', null),
        tx.pure.u8(room.permissionInvite),
        tx.pure.u8(room.permissionSendMessage),
        tx.object(SUI_CLOCK_OBJECT_ID)
      ]
    });
  }

  const roomsIds = (await signTransaction(profileOwner.privateKey, tx)).objectChanges.filter(change => change.type === 'created' && change.objectType === `${PACKAGE_ID}::chat_room::ChatRoom`).map(c => c.objectId);
  profileOwner.roomsIds = roomsIds;


  const profileJoiner = Object.values(profiles)[1];
  tx = new Transaction();
  tx.setSender(profileJoiner.address);

  for (let roomId of roomsIds) {
    tx.moveCall({
      target: `${PACKAGE_ID}::chat_room::invite_member`,
      arguments: [
        tx.object(roomId),
        tx.object(profileJoiner.profileId),
        tx.pure.address(profileJoiner.address),
        tx.pure.option('vector<u8>', null),
        tx.pure.option('vector<u8>', null),
        tx.pure.option('vector<u8>', null),
        tx.object(SUI_CLOCK_OBJECT_ID)
      ]
    });
  }

  await signTransaction(profileJoiner.privateKey, tx);
}

async function sendMessages() {

  for (let profile of Object.values(profiles)) {

    for (let roomId of profile.dmRoomsIds) {

      console.log(`- Adding messages from ${profile.username} to room ${roomId}`);

      const tx = new Transaction();
      tx.setSender(profile.address);
      for (let i = 0; i < 10; i++) {
        tx.moveCall({
          target: `${PACKAGE_ID}::chat_room::send_message`,
          arguments: [
            tx.object(profile.profileId),
            tx.object(roomId),
            tx.pure.string('content ' + i),
            tx.pure.option('id', null),
            tx.pure.vector('string', []),
            tx.object(SUI_CLOCK_OBJECT_ID)
          ]
        });
      }

      await signTransaction(profile.privateKey, tx);
    }
  }
}

async function signTransaction(privateKey, tx) {
  return await privateKey.signAndExecuteTransaction({
    client: client,
    transaction: tx
  }).then(r => client.waitForTransaction({
    digest: r.digest,
    options: { showEffects: true, showBalanceChanges: true, showEvents: true, showInput: true, showObjectChanges: true, showRawEffects: true, showRawInput: true }
  }));
};


// function getActiveAddress() { return execSync('sui client active-address').toString().trim(); }

// function setActiveAddress(addressAlias) { execSync(`sui client switch --address ${JSON.stringify(addressAlias)}`).toString().trim(); }

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