import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import config from '../.move.devnet.json' with { type: 'json' };
import profilesConfig from './userProfiles.json' with { type: 'json' };
import { execSync }  from 'child_process';

const {
  PackageId: PACKAGE_ID, 
  UserProfileRegistryId: USER_PROFILE_REGISTRY_ID, 
  ChatRoomRegistryId: CHAT_ROOM_REGISTRY_ID
} = config;
const CLOCK_ID = '0x6';

// const activeEnv = execSync('sui client active-env').toString().trim();
// const addresses = JSON.parse(execSync('sui client addresses --json').toString().trim()).addresses;
const client = new SuiClient({ network: 'devnet', url: getFullnodeUrl('devnet') });
const profiles = profilesConfig.reduce((acc, prof) => { acc[prof.address] = prof; return acc;}, {}); // <-- [{ alias, address, signature, username, avatarUrl, keys { keyPub, keyPrivDerived, keyIv, keySalt } }]

extractPrivateKeys();
await addUserProfiles();
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
        tx.object(CLOCK_ID)
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
        tx.object(CLOCK_ID)
      ]
    });

    const dmRoomId = (await signTransaction(dmPair[0].privateKey, tx)).objectChanges.find(change => change.type === 'created' && change.objectType === `${PACKAGE_ID}::chat_room::ChatRoom`).objectId;
    
    dmPair[0].roomsIds = dmPair[0].roomsIds || [];
    dmPair[1].roomsIds = dmPair[1].roomsIds || [];

    dmPair[0].roomsIds.push(dmRoomId);
    dmPair[1].roomsIds.push(dmRoomId);
  }
}

async function sendMessages() {

  for (let profile of Object.values(profiles)) {

    for (let roomId of profile.roomsIds) {

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
            tx.object(CLOCK_ID)
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