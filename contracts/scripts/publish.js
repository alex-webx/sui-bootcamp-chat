import path  from 'path';
import fs  from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const dirname = import.meta.dirname;
const activeEnv = execSync('sui client active-env').toString().trim();
const timestamp = new Date().getTime();

const moveLockFile = path.resolve(dirname, '../Move.lock');
const configFilePath = path.resolve(dirname, `../.move.${activeEnv}.json`);
const pubEnvHistoryDir = path.resolve(dirname, `../_pubhistory/${activeEnv}`);

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
