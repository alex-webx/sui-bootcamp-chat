import { SuiObjectResponse } from '@mysten/sui/client';
import { client, config, getFullTable, getMultiObjects } from '../../useClient';
import type * as Models from '../..';

export const getUserProfileRegistry = async (): Promise<Models.UserProfileRegistry | undefined> => {
  const userProfileRegistry = await client.getObject({ id: config('UserProfileRegistryId')!, options: { showContent: true }});
  if (userProfileRegistry.data?.content?.dataType === 'moveObject') {
    const fields = userProfileRegistry.data?.content.fields as any;
    const users = await getFullTable(fields.users);

    return {
      id: fields.id?.id,
      users: users
    };
  }
  return undefined;
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

export const getAllUsersProfiles = async (profilesIds: string[] = []) => {
  const profilesRes = await getMultiObjects({
    ids: profilesIds?.length ? profilesIds : Object.values((await getUserProfileRegistry())?.users!)
  });
  const profiles = profilesRes.map(profile => parseUserProfile(profile));
  return profiles;
}
