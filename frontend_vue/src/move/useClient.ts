import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { useLocalStorage } from '../composables/useLocalStorage';
import { computed, type Ref } from 'vue';
import type { Network } from '../../configs';

export const network = useLocalStorage('SUI_NETWORK', 'devnet') as any as Ref<Network>;
export const client = new SuiClient({ url: getFullnodeUrl(network.value) });
