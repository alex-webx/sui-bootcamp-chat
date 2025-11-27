import _ from 'lodash';
import { Transaction } from '@mysten/sui/transactions';
import { useConfig } from '../../../../configs';
import { parsers } from '../../useClient';
import type * as Models from '../..';
import { EPermission, ERoomType, RoomKey } from './chatRoomModels';

const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

export const txCreateRoom = (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    room: Required<Pick<Models.ChatRoom, 'name' | 'imageUrl' | 'maxMembers' | 'roomType' | 'permissionInvite' | 'permissionSendMessage'>>,
    roomKey: RoomKey
  }
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${config('PackageId')}::chat_room::create_room`,
    arguments: [
      tx.object(data.userProfile.id),
      tx.object(config('ChatRoomRegistryId')!),
      tx.pure.string(data.room.name),
      tx.pure.string(data.room.imageUrl),
      tx.pure.u64(data.room.maxMembers),
      tx.pure.u8(data.room.roomType),
      tx.pure.option('vector<u8>', data.roomKey?.pubKey as any),
      tx.pure.option('vector<u8>', data.roomKey?.iv as any),
      tx.pure.option('vector<u8>', data.roomKey?.encodedPrivKey as any),
      tx.pure.u8(data.room.permissionInvite),
      tx.pure.u8(data.room.permissionSendMessage),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isCreated('chat_room::ChatRoom');
  return { tx, parser };
};

export const txCreateDmRoom = (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    inviteeAddress: string
  }
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::create_dm_room`,
    arguments: [
      tx.object(config('ChatRoomRegistryId')!),
      tx.object(data.userProfile.id),
      tx.pure.address(data.inviteeAddress),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isCreated('chat_room::ChatRoom');
  return { tx, parser };
};

export const txSendMessage = (
  userProfileId: string,
  message: Pick<Models.Message, 'content' | 'roomId' | 'mediaUrl' | 'replyTo'>
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${config('PackageId')}::chat_room::send_message`,
    arguments: [
      tx.object(userProfileId),
      tx.object(message.roomId),
      tx.pure.string(message.content),
      tx.pure.option('id', message.replyTo || null),
      tx.pure.vector('string', message.mediaUrl),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isCreated('chat_room::Message');
  return { tx, parser };
};

export const txEditMessage = (
  message: Pick<Models.Message, 'id' | 'roomId'>,
  newMessage: Pick<Models.Message, 'content' | 'mediaUrl'>
) => {

  const tx = new Transaction();

  tx.moveCall({
    target: `${config('PackageId')}::chat_room::edit_message`,
    arguments: [
      tx.object(message.roomId),
      tx.object(message.id),
      tx.pure.string(newMessage.content),
      tx.pure.vector('string', newMessage.mediaUrl),
      tx.pure.bool(true),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isUpdated('chat_room::Message');
  return { tx, parser };
};

export const txDeleteMessage = (
  message: Pick<Models.Message, 'id' |  'roomId'>,
) => {

  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::delete_message`,
    arguments: [
      tx.object(message.roomId),
      tx.object(message.id),
      tx.pure.bool(true),
      tx.object(config('SuiClockId')!)
    ],
  });

  const parser = parsers.isUpdated('chat_room::Message');
  return { tx, parser };
};

export const txInviteMember = (
  profile: Pick<Models.UserProfile, 'id'>,
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  inviteeAddress: string,
  roomKey?: Models.RoomKey
) => {

  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::invite_member`,
    arguments: [
      tx.object(chatRoom.id),
      tx.object(profile.id),
      tx.pure.address(inviteeAddress),
      tx.pure.option('vector<u8>', roomKey?.pubKey as any),
      tx.pure.option('vector<u8>', roomKey?.iv as any),
      tx.pure.option('vector<u8>', roomKey?.encodedPrivKey as any),
      tx.object(config('SuiClockId')!)
    ],
  });

  return tx;
};

export const txJoinRoom = (
  data: {
    room: Pick<Models.ChatRoom, 'id'>,
    profile: Pick<Models.UserProfile, 'id'>
  }
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::join_room`,
    arguments: [
      tx.object(data.room.id),
      tx.object(data.profile.id),
      tx.object(config('SuiClockId')!)
    ],
  });

  return tx;
};

export const txAddModerator = (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  newModeratorAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::add_moderator`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(newModeratorAddress),
      tx.object(config('SuiClockId')!)
    ]
  });

  return tx;
};

export const txRemoveModerator = (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  moderatorAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::remove_moderator`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(moderatorAddress),
      tx.object(config('SuiClockId')!)
    ]
  });

  return tx;
};

export const txBanUser = (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  userAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::ban_user`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(userAddress),
      tx.object(config('SuiClockId')!)
    ]
  });

  return tx;
};

export const txUnbanUser = (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  userAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config('PackageId')}::chat_room::unban_user`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(userAddress),
      tx.object(config('SuiClockId')!)
    ]
  });

  return tx;
};
