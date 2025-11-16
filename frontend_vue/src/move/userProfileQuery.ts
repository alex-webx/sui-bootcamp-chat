import { Transaction } from '@mysten/sui/transactions';
import { SuiObjectResponse } from '@mysten/sui/client';
import { useConfig } from '../../configs';
import { client } from './useClient';
import type * as Models from '.';
import encrypt from '../utils/encrypt';

export const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

export const getUserProfileRegistry = async () => {
  const userProfileRegistry = await client.getObject({ id: config('UserProfileRegistryId')!, options: { showContent: true }});
  return userProfileRegistry;
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
      StructType: `${config('PackageId')}::user_profile::UserProfile`,
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
