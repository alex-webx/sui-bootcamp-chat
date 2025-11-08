import { defineStore } from 'pinia';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { ref, computed } from 'vue';

export const useSuiClientStore = defineStore('suiClient', () => {
  const network = ref<'mainnet' | 'testnet' | 'devnet'>('devnet');
  
  const client = computed(() => {
    return new SuiClient({ url: getFullnodeUrl(network.value) });
  });

  const setNetwork = (newNetwork: 'mainnet' | 'testnet' | 'devnet') => {
    network.value = newNetwork;
  };

  return {
    client,
    network,
    setNetwork,
  };
});