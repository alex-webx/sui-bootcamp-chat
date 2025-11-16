import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import type { Network } from '../../configs';

export const getNetwork = () => (localStorage.getItem('SUI_NETWORK') || 'devnet') as Network;
export const setNetwork = (network: Network) => localStorage.setItem('SUI_NETWORK', network);
export const client = new SuiClient({ url: getFullnodeUrl(getNetwork()) });
