const path = require('path');
const fs = require('fs');

const { execSync } = require('child_process');

const moveLockFile = './Move.lock';
const activeEnv = execSync('sui client active-env').toString().trim();
const envFile = `./.env.${activeEnv}`;
const pubHistoryDir = `./_pubhistory/${activeEnv}`;

const timestamp = new Date().getTime();

if (!fs.existsSync(pubHistoryDir)) {
  fs.mkdirSync(pubHistoryDir, true);
}

if (fs.existsSync(moveLockFile)) {
  fs.unlinkSync(moveLockFile);
}

const res = JSON.parse(execSync('sui client publish --json'));
const { objectChanges } = res;

const env = {
  PACKAGE_ID: objectChanges.find(change => change.type === 'published' && change.packageId)?.packageId,
  USER_PROFILE_REGISTRY_ID: objectChanges.find(change => change.type === 'created' && change.objectType.endsWith('::UserProfileRegistry'))?.objectId,
  CHAT_ROOM_REGISTRY_ID: objectChanges.find(change => change.type === 'created' && change.objectType.endsWith('::ChatRoomRegistry'))?.objectId
};

console.log(env);

const envContent = Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n');

if (fs.existsSync(envFile)) {
  fs.unlinkSync(envFile);
}
fs.writeFileSync(envFile, envContent, 'utf8');
fs.writeFileSync(`${pubHistoryDir}/${timestamp}_.env`, envContent, 'utf8');

if (fs.existsSync(moveLockFile)) {
  fs.renameSync(moveLockFile, `${pubHistoryDir}/${timestamp}_Move.lock`);
}
