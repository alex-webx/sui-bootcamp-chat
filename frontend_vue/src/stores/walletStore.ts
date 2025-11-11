import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getWallets, StandardEvents, StandardConnect, StandardFeatures, StandardConnectFeature } from '@mysten/wallet-standard';
import type { WalletAccount, Wallet, StandardEventsFeature } from '@mysten/wallet-standard';
import { useSuiClientStore } from './suiClientStore';

export const useWalletStore = defineStore('wallet', () => {

  const suiClientStore = useSuiClientStore();
  const account = ref<WalletAccount | null>(null);
  const wallets = ref<Wallet[]>([]);
  const isConnecting = ref(false);
  const isConnected = computed(() => !!account.value);
  const address = computed(() => account.value?.address);

  const detectWallets = () => {
    const walletsApi = getWallets();
    wallets.value = walletsApi.get() as Wallet[];

    walletsApi.on('register', () => {
      wallets.value = walletsApi.get() as Wallet[];
    });
  };

  const connect = async (walletName?: string) => {
    isConnecting.value = true;

    try {
      const walletsApi = getWallets();
      const availableWallets = walletsApi.get();

      const wallet = walletName ? availableWallets.find(w => w.name === walletName) : availableWallets[0];

      if (!wallet) {
        throw new Error('Nenhuma carteira encontrada');
      }

      const connectionRes = await (wallet.features as StandardConnectFeature)[StandardConnect].connect({
        //chains: [suiClientStore.network]
        silent: false
      });

      if (connectionRes?.accounts.length > 0) {
        account.value = connectionRes?.accounts[0]!;

        localStorage.setItem('sui_wallet', wallet.name);
        localStorage.setItem('sui_account', account.value?.address);

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
    const availableWallets = walletsApi.get();
    const walletName = localStorage.getItem('sui_wallet');
    const wallet = walletName
      ? availableWallets.find(w => w.name === walletName)
      : availableWallets[0];

    return wallet;
  }

  const disconnect = () => {
    account.value = null;
    const walletName = localStorage.getItem('sui_wallet');
    localStorage.removeItem('sui_wallet');
    localStorage.removeItem('sui_account');

    const walletsApi = getWallets();
    const availableWallets = walletsApi.get();

    const wallet = walletName
      ? availableWallets.find(w => w.name === walletName)
      : availableWallets[0];

    (wallet?.features['standard:disconnect'] as any).disconnect();

    account.value = null;
    wallets.value = [];
  };

  const autoConnect = async () => {
    const savedWallet = localStorage.getItem('sui_wallet');
    if (savedWallet) {
      try {
        await connect(savedWallet);
        return true;
      } catch (error) {
        console.error('Falha ao reconectar:', error);
        disconnect();
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
    detectWallets,
    autoConnect,
    getConnectedWallet
  };
});
