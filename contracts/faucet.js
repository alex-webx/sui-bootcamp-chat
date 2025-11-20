const { execSync } = require('child_process');

const activeEnv = execSync('sui client active-env').toString().trim();
const addresses = JSON.parse(execSync('sui client addresses --json').toString().trim()).addresses;

for (let tester of addresses) {
  const [ alias, address ] = tester;
  console.log(`[${activeEnv}] Faucet for ${address} = ${alias}`);
  execSync(`sui client faucet --address ${address}`);  
}