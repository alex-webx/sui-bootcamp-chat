import { Transaction } from '@mysten/sui/transactions';
import { SuiObjectResponse } from '@mysten/sui/client';
import Constants from '../../configs';
import { client } from './useClient';
import type * as Models from './';
import encrypt from '../utils/encrypt';

export const getUserProfileRegistry = async () => {
  const userProfileRegistry = await client.getObject({ id: Constants('UserProfileRegistryId')!, options: { showContent: true }});
  return userProfileRegistry;
};

export const createUserProfile = async (
  userProfile: Pick<Models.UserProfile, 'username' | 'avatarUrl' | 'keyIv' | 'keyPrivDerived' | 'keyPub' | 'keySalt'>
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Constants('PackageId')}::user_profile::create_user_profile`,
    arguments: [
      tx.object(Constants('UserProfileRegistryId')!),
      tx.pure.string(userProfile.username),
      tx.pure.string(userProfile.avatarUrl),
      tx.pure.vector('u8', userProfile.keyPub),
      tx.pure.vector('u8', userProfile.keyPrivDerived),
      tx.pure.vector('u8', userProfile.keyIv),
      tx.pure.vector('u8', userProfile.keySalt),
      tx.object(Constants('SuiClockId')!)
    ],
  });
  return tx;
};

export const updateUserProfile = async (
  userProfileId: string,
  newUserProfile: Pick<Models.UserProfile, 'username' | 'avatarUrl'>
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
  return tx;
};

export const deleteUserProfile = (userProfileId: string) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Constants('PackageId')}::user_profile::delete_user_profile`,
    arguments: [
      tx.object(Constants('UserProfileRegistryId')!),
      tx.object(userProfileId)
    ],
  });

  return tx;
};

export const joinRoom = (profile: Pick<Models.UserProfile, 'id'>, chatRoom: Pick<Models.ChatRoom, 'id'>) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Constants('PackageId')}::user_profile::add_user_profile_rooms_joined`,
    arguments: [
      tx.object(Constants('UserProfileRegistryId')!),
      tx.object(profile.id),
      tx.pure.id(chatRoom.id)
    ],
  });

  return tx;
};

export const parseUserProfile = (response: SuiObjectResponse): Models.UserProfile => {
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
    keyPub: new Uint8Array(fields.key_pub),
    keyPrivDerived: new Uint8Array(fields.key_priv_derived),
    keyIv: new Uint8Array(fields.key_iv),
    keySalt: new Uint8Array(fields.key_salt)
  };
};

export const getUserProfile = async (address: string) => {
  const response = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${Constants('PackageId')}::user_profile::UserProfile`,
    },
    options: { showContent: true },
  });

  const userProfiles = response.data.map(parseUserProfile);
  return userProfiles[0];
}

export const getAllUsersProfiles = async () => {
  const userProfileRegistry = await getUserProfileRegistry();
  const userProfileRegistryTableId = (userProfileRegistry.data?.content as any).fields?.users?.fields?.id?.id as string;

  const dynamicFieldPage = await client.getDynamicFields({ parentId: userProfileRegistryTableId });

  const objectsRes = await client.multiGetObjects({
    ids: dynamicFieldPage.data?.map(row => row.objectId),
    options: { showContent: true }
  });
  const profilesMapping = objectsRes.map(obj => {
    const profile = (obj.data?.content as any)?.fields as any;
    return { address: profile.name as string, profileId: profile.value as string }
  });
  const profilesRes = await client.multiGetObjects({
    ids: profilesMapping.map(profile => profile.profileId),
    options: { showContent: true }
  });
  const profiles = profilesRes.map(profile => parseUserProfile(profile));
  return profiles;
}
