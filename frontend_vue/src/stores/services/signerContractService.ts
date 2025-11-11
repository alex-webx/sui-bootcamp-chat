import { Transaction } from '@mysten/sui/transactions';
import { useSuiClientStore } from '../suiClientStore';
import { useWalletStore } from '../walletStore';

export function useSignerContractService() {

  const suiClientStore = useSuiClientStore();
  const walletStore = useWalletStore();

  const signAndExecuteTransaction = async (tx: Transaction) => {
    const network = suiClientStore.network;
    const client = suiClientStore.client;
    const wallet = walletStore.getConnectedWallet()!;
    const walletAccount = walletStore.account!;

    const { bytes, digest, effects, signature } = await (wallet.features['sui:signAndExecuteTransaction'] as any).signAndExecuteTransaction({
      account: walletAccount,
      chain: `sui:${network}`,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

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


  return {
    signAndExecuteTransaction
  };
}
