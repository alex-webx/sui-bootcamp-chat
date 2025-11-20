import { Transaction } from '@mysten/sui/transactions';
import { useConfig } from '../../../../configs';
import { client, parsers } from '../../useClient';
import type * as Models from '../..';

const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

export const txCreateUserProfile = (
  userProfile: Pick<Models.UserProfile, 'username' | 'avatarUrl' | 'keyIv' | 'keyPrivDerived' | 'keyPub' | 'keySalt'>
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::user_profile::create_user_profile`,
    arguments: [
      tx.object(config('UserProfileRegistryId')!),
      tx.pure.string(userProfile.username),
      tx.pure.string(userProfile.avatarUrl),
      tx.pure.vector('u8', userProfile.keyPub),
      tx.pure.vector('u8', userProfile.keyPrivDerived),
      tx.pure.vector('u8', userProfile.keyIv),
      tx.pure.vector('u8', userProfile.keySalt),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isCreated('user_profile::UserProfile');
  return { tx, parser };
};

export const txUpdateUserProfile = (
  userProfileId: string,
  newUserProfile: Pick<Models.UserProfile, 'username' | 'avatarUrl'>
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::user_profile::update_user_profile`,
    arguments: [
      tx.object(userProfileId),
      tx.pure.string(newUserProfile.username),
      tx.pure.string(newUserProfile.avatarUrl),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isUpdated('user_profile::UserProfile');
  return { tx, parser };
};

export const txDeleteUserProfile = (userProfileId: string) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::user_profile::delete_user_profile`,
    arguments: [
      tx.object(config('UserProfileRegistryId')!),
      tx.object(userProfileId)
    ],
  });

  const parser = parsers.isDeleted(userProfileId);
  return { tx, parser };
};

export const txJoinRoom = (profile: Pick<Models.UserProfile, 'id'>, chatRoom: Pick<Models.ChatRoom, 'id'>) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::user_profile::add_user_profile_rooms_joined`,
    arguments: [
      tx.object(config('UserProfileRegistryId')!),
      tx.object(profile.id),
      tx.pure.id(chatRoom.id)
    ],
  });

  return tx;
};
