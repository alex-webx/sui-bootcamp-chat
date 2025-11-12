import { defineStore } from 'pinia';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { ref, computed, watch } from 'vue';

export const useSuiClientStore = defineStore('suiClient', () => {
  const network = ref<'mainnet' | 'testnet' | 'devnet'>('devnet');

  const client = computed(() => {
    return new SuiClient({ url: getFullnodeUrl(network.value) });
  });

  const setNetwork = (newNetwork: 'mainnet' | 'testnet' | 'devnet') => {
    network.value = newNetwork;
  };

  if (localStorage.getItem('SUI_NETWORK')) {
    network.value = localStorage.getItem('SUI_NETWORK') as any;
  }

  watch(network, newNetwork => {
    localStorage.setItem('SUI_NETWORK', newNetwork);
  });

  return {
    client,
    network: computed(() => network.value),
    setNetwork,
  };
});
