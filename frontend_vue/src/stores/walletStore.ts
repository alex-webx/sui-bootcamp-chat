import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getWallets, StandardEvents, StandardConnect, StandardFeatures, StandardConnectFeature } from '@mysten/wallet-standard';
import type { WalletAccount, Wallet, StandardEventsFeature, Wallets } from '@mysten/wallet-standard';

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

  const account = ref<WalletAccount | null>(null);
  const isConnecting = ref(false);
  const isConnected = computed(() => !!account.value);
  const address = computed(() => account.value?.address);

  const detectWallets = () => {
    const walletsApi = getWallets();
    wallets.value = getSuiWallets(walletsApi);

    walletsApi.on('register', () => {
      console.log('wallet registed')
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

    // storedSuiWallet.value = '';
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
    if (savedWallet) {
      try {
        await connect(savedWallet);
        return true;
      } catch (error) {
        console.error('Falha ao reconectar:', error);
        await disconnect();
      }
    }
  };

  return {
    // State
    account,
    wallets,
    isConnecting,

    // Getters
    isConnected,
    address,
    shortAddress: computed(() => `${address.value?.slice(0, 6)}...${address.value?.slice(-4)}`),

    // Actions
    connect,
    disconnect,
    autoConnect,
    getConnectedWallet,

    resetState: async () => {
      account.value = null;
      wallets.value = [];
      isConnecting.value = false;
    }
  };
});
