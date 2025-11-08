import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSuiClientStore } from './suiClientStore';
import { useWalletStore } from './walletStore';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const PACKAGE_ID = process.env.PACKAGE_ID;

export interface UserProfile {
  id: string;
  owner: string;
  name: string;
  avatarUrl: string
  // messageCount: number;
  // createdAt: number;
  // roomsJoined: string[];
}

export const useUserProfileStore = defineStore('userProfile', () => {
  const suiClient = useSuiClientStore();
  const walletStore = useWalletStore();

  // State
  const profiles = ref<Record<string, UserProfile>>({});
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const lastTxDigest = ref<string | null>(null);

  // Actions
  const fetchUserProfiles = async () => {
    loading.value = true;
    error.value = null;

    try {

      const address = walletStore.getConnectedWallet()?.accounts[0]?.address!;

      const response = await suiClient.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::user_profile::UserProfile`,
        },
        options: { showContent: true },        
      });

      const userProfiles = response.data
        .filter((obj) => obj.data?.content?.dataType === 'moveObject')
        .map((obj) => {
          const fields = (obj.data!.content as any).fields as any;
          return <UserProfile> {
            id: obj.data!.objectId,
            owner: fields.owner,
            name: fields.name,
            //messageCount: Number(fields.message_count),
            avatarUrl: fields.avatar_url,
            // createdAt: Number(fields.created_at),
            // roomsJoined: fields.rooms_joined || [],
          };
        });

      profiles.value = {};

      // Armazenar no state
      for (let profile of userProfiles) {
        profiles.value[profile.id as any] = profile;
      }

      return userProfiles;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getProfile = (profileId: string) => {
    return profiles.value[profileId];
  };

  const createProfile = async (username: string) => {
    if (!walletStore.account) {
      throw new Error('Carteira não conectada');
    }

    loading.value = true;
    error.value = null;

    try {

      const existingProfiles = await fetchUserProfiles();

      if (existingProfiles?.length) {
        throw new Error('Usuário já possui profile');
      }

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::user_profile::create_user_profile`,
        arguments: [
          tx.pure.string(username),
          tx.pure.string(''),
//          tx.object('0x6'), // Clock
        ],
      });

      const wallet = walletStore.getConnectedWallet();
      const result = (await wallet?.features['sui:signAndExecuteTransactionBlock'] as any)
        .signAndExecuteTransactionBlock({
          chain: 'sui:' + suiClient.network,
          transactionBlock: tx,
          account: walletStore.account,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

      lastTxDigest.value = result.digest;
      
      await suiClient.client.waitForTransactionBlock({
        digest: result.digest,
      });

      return result;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  };


  return {
    // State
    profiles,
    loading,
    error,
    
    // Actions
    fetchUserProfiles,
    getProfile,
    createProfile
  };
});