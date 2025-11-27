import { defineBoot } from '#q-app/wrappers';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export const TEST_WALLETS_PROVIDE_KEY = 'TestWallets';
export type TestWallets = Record<string, Ed25519Keypair>;

export default defineBoot(async ({ app }) => {
  const testWallets: TestWallets = {};
   if (process.env.TEST_WALLETS) {
    console.log('===== LOCAL ENV: carregando test wallets =====')
    for (let testWallet of process.env.TEST_WALLETS.split(',')) {
      const pk = Ed25519Keypair.fromSecretKey(testWallet);
      const suiAddress = pk.getPublicKey().toSuiAddress();
      console.log(suiAddress);
      testWallets[suiAddress] = pk;
    }
    console.log('===== LOCAL ENV: test wallets carregadas =====')
  }
  app.provide(TEST_WALLETS_PROVIDE_KEY, testWallets);
});
