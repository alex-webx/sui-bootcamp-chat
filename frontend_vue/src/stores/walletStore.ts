import { defineStore } from 'pinia';
import { ref, computed, inject } from 'vue';
import { getWallets, StandardConnect, StandardConnectFeature } from '@mysten/wallet-standard';
import type { WalletAccount, Wallet, Wallets } from '@mysten/wallet-standard';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import formatters from '../utils/formatters';
import { client, getNetwork } from '../move';

const getSuiWallets = (walletsApi: Wallets) => {
  return walletsApi.get().filter(wallet => !!wallet.chains.find(chain => chain.startsWith('sui:')));
}

export const storedSuiState = {
  get wallet() { return localStorage.getItem('sui_wallet') as string || ''; },
  set wallet(value) { localStorage.setItem('sui_wallet', value); },
  get account() { return localStorage.getItem('sui_account') as string || ''; },
  set account (value) { localStorage.setItem('sui_account', value); }
};

export const useWalletStore = defineStore('wallet', () => {

  const wallets = ref<Wallet[]>([]);
  const TestWallets = inject('TestWallets') as Record<string, Ed25519Keypair>;

  const account = ref<WalletAccount | null>(null);
  const isConnecting = ref(false);
  const isConnected = computed(() => !!account.value);
  const address = computed(() => account.value?.address);

  const detectWallets = () => {
    const walletsApi = getWallets();
    wallets.value = getSuiWallets(walletsApi);

    walletsApi.on('register', () => {
      console.log('wallet registered')
      wallets.value = getSuiWallets(walletsApi);
    });
  };

  const connect = async (walletName: string, abortSignal?: AbortSignal, timeout: number = 0) => {
    isConnecting.value = true;

    try {
      const walletsApi = getWallets();
      const allSuiWallets = getSuiWallets(walletsApi);

      const wallet = walletName ? allSuiWallets.find(w => w.name === walletName) : allSuiWallets[0];

      if (!wallet) {
        throw new Error('Nenhuma carteira encontrada');
      }

      const abortPromise = new Promise((_, reject) => abortSignal?.addEventListener('abort', reject));
      const timeoutPromise = new Promise((_, reject) => timeout ? setTimeout(reject, timeout) : null);
      const connectionResPromise = (wallet.features as StandardConnectFeature)[StandardConnect].connect();
      const connectionRes = await Promise.race([ abortPromise, timeoutPromise, connectionResPromise ]) as Awaited<typeof connectionResPromise>;

      if (connectionRes?.accounts.length > 0) {
        account.value = connectionRes?.accounts.find(acc => acc.address === storedSuiState.account)!;
        if(!account.value) {
          account.value = connectionRes?.accounts[0]!;
        }

        storedSuiState.wallet = wallet.name;
        storedSuiState.account = account.value?.address;

        // (wallet.features as StandardEventsFeature)[StandardEvents].on('change', (newAccounts: any) => {
        //   console.log('mudou', newAccounts);
        // });
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      throw error;
    } finally {
      isConnecting.value = false;
    }
  };

  const getConnectedWallet = () => {
    const walletsApi = getWallets();
    const availableWallets = getSuiWallets(walletsApi);
    const wallet = storedSuiState.wallet
      ? availableWallets.find(w => w.name === storedSuiState.wallet)
      : availableWallets[0];

    return wallet;
  }

  const disconnect = async () => {
    account.value = null;

    const walletName = storedSuiState.wallet;

    storedSuiState.account = '';

    const walletsApi = getWallets();
    const allSuiWallets = getSuiWallets(walletsApi);

    const wallet = walletName
      ? allSuiWallets.find(w => w.name === walletName)
      : allSuiWallets[0];

    await (wallet?.features['standard:disconnect'] as any).disconnect();
  };

  const autoConnect = async () => {
    await detectWallets();
    const savedWallet = storedSuiState.wallet;
    if (!!storedSuiState.wallet && !!storedSuiState.account) {
      try {
        await connect(savedWallet);
        return true;
      } catch (error) {
        console.error('Falha ao reconectar:', error);
        await disconnect();
      }
    }
  };

  const signAndExecuteTransaction = async (tx: Transaction) => {
    const wallet = getConnectedWallet()!;
    let digest = '';

    // bypass test wallets
    if (TestWallets[account.value?.address!]) {
      console.log(`Auto-signAndExecuteTransaction with test wallet: address ${account.value?.address}`);
      tx.setSender(account.value!.address);
      const res = await TestWallets[account.value?.address!]?.signAndExecuteTransaction({
        client: client,
        transaction: tx
      });
      digest = res!.digest;
    } else {
      const res = await (wallet.features['sui:signAndExecuteTransaction'] as any).signAndExecuteTransaction({
        account: account.value,
        chain: `sui:${getNetwork()}`,
        transaction: tx,
        // options: {
        //   showEffects: true,
        //   showObjectChanges: true
        // }
      });
      digest = res.digest;
    }

    return client.waitForTransaction({
      digest,
      options: {
        showBalanceChanges: true,
        showEvents: true,
        showInput: true,
        showRawEffects: true,
        showRawInput: true,
        showEffects: true,
        showObjectChanges: true
      }
    });
  };

  const signMessage = async (message: string) => {
    const wallet = getConnectedWallet()!;

    // bypass test wallets
    if (TestWallets[account.value?.address!]) {
      console.log(`Auto-signPersonalMessage with test wallet: address ${account.value?.address}`);
      return await TestWallets[account.value?.address!]?.signPersonalMessage(new TextEncoder().encode(message));
    }

    const result = await (wallet.features['sui:signPersonalMessage'] as any).signPersonalMessage({
      message: new TextEncoder().encode(message),
      account: account.value
    });

    return result as { bytes: string, signature: string };
  };

  const generateMasterSignature = async () => {
    const owner = address.value;

    try {
      const res = await signMessage([
          `SUI CHAT`,
          ``,
          `Eu estou assinando esta mensagem para geração de chaves que serão utilizadas para os algoritmos ECDH e E2EE.`,
          ``,
          `Carteira:`,
          `${owner}`,
        ].join('\n')
      );
      return res;
    } catch {
      return null;
    }
  }

  return {
    // State
    account,
    wallets,
    isConnecting,

    // Getters
    isConnected,
    address,
    shortAddress: computed(() => formatters.shortenAddress(address.value!)),

    // Actions
    connect,
    disconnect,
    autoConnect,
    getConnectedWallet,

    signAndExecuteTransaction,
    signMessage,
    generateMasterSignature,

    resetState: async () => {
      await disconnect();
      account.value = null;
      wallets.value = [];
      isConnecting.value = false;
    }
  };
});
