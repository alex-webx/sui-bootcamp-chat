const path = require('path');
const fs = require('fs');

const { execSync } = require('child_process');

const moveLockFile = './Move.lock';
const activeEnv = execSync('sui client active-env').toString().trim();
const configFilePath = `./.move.${activeEnv}.json`;
const pubEnvHistoryDir = `./_pubhistory/${activeEnv}`;

const timestamp = new Date().getTime();

if (!fs.existsSync(pubEnvHistoryDir)) {
  fs.mkdirSync(pubEnvHistoryDir, true);
}

if (fs.existsSync(moveLockFile)) {
  fs.unlinkSync(moveLockFile);
}

const res = JSON.parse(execSync('sui client publish --json'));
const { objectChanges } = res;

const configValues = {
  PackageId: objectChanges.find(change => change.type === 'published' && change.packageId)?.packageId,
  UserProfileRegistryId: objectChanges.find(change => change.type === 'created' && change.objectType.endsWith('::UserProfileRegistry'))?.objectId,
  ChatRoomRegistryId: objectChanges.find(change => change.type === 'created' && change.objectType.endsWith('::ChatRoomRegistry'))?.objectId
};

console.log(configValues);

if (fs.existsSync(configFilePath)) {
  fs.unlinkSync(configFilePath);
}
fs.writeFileSync(configFilePath, JSON.stringify(configValues, null, 2), 'utf8');
fs.writeFileSync(`${pubEnvHistoryDir}/${timestamp}.move.json`, JSON.stringify(configValues, null, 2), 'utf8');

if (fs.existsSync(moveLockFile)) {
  fs.renameSync(moveLockFile, `${pubEnvHistoryDir}/${timestamp}_Move.lock`);
}
