import { SuiObjectResponse } from '@mysten/sui/client';
import { client, getNetwork } from './useClient';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';

export const getSuiBalance = async (address: string) => {
  try {
    const balances = await client.getAllBalances({ owner: address });
    return BigInt(balances.find(balance => balance.coinType === '0x2::sui::SUI')?.totalBalance || 0);
  } catch {
    return null;
  }
}

export const getFaucet = async (address: string) => {
  return requestSuiFromFaucetV2({
    host: getFaucetHost('devnet'),
    recipient: address
  })
};
