import { Transaction } from '@mysten/sui/transactions';
import { useSuiClientStore } from '../stores/suiClientStore';
import { useSignerContractService } from './signerContractService';
import Constants from '../../configs';
import { SuiObjectResponse } from '@mysten/sui/client';

export type UserProfile = {
  id: string,
  owner: string,
  username: string,
  avatarUrl: string,
  updatedAt: number,
  createdAt: number,
  roomsJoined: string[]
}

export function useUserProfileContractService() {

  const suiClientStore = useSuiClientStore();
  const signer = useSignerContractService();

  const getUserProfileRegistry = async () => {
    const userProfileRegistry = await suiClientStore.client.getObject({ id: Constants('UserProfileRegistryId')!, options: { showContent: true }});
    return userProfileRegistry;
  };

  const createUserProfile = async (userProfile: Pick<UserProfile, 'username' | 'avatarUrl'>) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${Constants('PackageId')}::user_profile::create_user_profile`,
      arguments: [
        tx.object(Constants('UserProfileRegistryId')!),
        tx.pure.string(userProfile.username),
        tx.pure.string(userProfile.avatarUrl),
        tx.object(Constants('SuiClockId')!)
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const updateUserProfile = async (
    userProfileId: string,
    newUserProfile: Pick<UserProfile, 'username' | 'avatarUrl'>
  ) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${Constants('PackageId')}::user_profile::update_user_profile`,
      arguments: [
        tx.object(userProfileId),
        tx.pure.string(newUserProfile.username),
        tx.pure.string(newUserProfile.avatarUrl),
        tx.object(Constants('SuiClockId')!)
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const deleteUserProfile = (userProfileId: string) => {
   const tx = new Transaction();
    tx.moveCall({
      target: `${Constants('PackageId')}::user_profile::delete_user_profile`,
      arguments: [
        tx.object(Constants('UserProfileRegistryId')!),
        tx.object(userProfileId)
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const parseUserProfile = (response: SuiObjectResponse): UserProfile => {
    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
      throw new Error('Perfil inválido');
    }

    const fields = response.data.content.fields as any;
    return {
      id: response.data.objectId,
      owner: fields.owner,
      username: fields.username,
      avatarUrl: fields.avatar_url,
      updatedAt: Number(fields.updated_at),
      createdAt: Number(fields.created_at),
      roomsJoined: fields.rooms_joined || [],
    };
  };

  const getUserProfile = async (address: string) => {
    const response = await suiClientStore.client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${Constants('PackageId')}::user_profile::UserProfile`,
      },
      options: { showContent: true },
    });

    const userProfiles = response.data.map(parseUserProfile);
    return userProfiles[0];
  }

  const getAllUsersProfiles = async () => {
    const userProfileRegistry = await getUserProfileRegistry();
    const userProfileRegistryTableId = (userProfileRegistry.data?.content as any).fields?.users?.fields?.id?.id as string;

    const dynamicFieldPage = await suiClientStore.client.getDynamicFields({ parentId: userProfileRegistryTableId });

    const objectsRes = await suiClientStore.client.multiGetObjects({
      ids: dynamicFieldPage.data?.map(row => row.objectId),
      options: { showContent: true }
    });
    const profilesMapping = objectsRes.map(obj => {
      const profile = (obj.data?.content as any)?.fields as any;
      return { address: profile.name as string, profileId: profile.value as string }
    });
    const profilesRes = await suiClientStore.client.multiGetObjects({
      ids: profilesMapping.map(profile => profile.profileId),
      options: { showContent: true }
    });
    const profiles = profilesRes.map(profile => parseUserProfile(profile));
    return profiles;
  }

  return {
    createUserProfile,
    updateUserProfile,
    deleteUserProfile,
    getUserProfile,
    getAllUsersProfiles,
    parseUserProfile,
    getUserProfileRegistry
  };
}
