import _ from 'lodash';
import { Transaction } from '@mysten/sui/transactions';
import { SuiObjectResponse } from '@mysten/sui/client';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import Config from '../../configs';
import { client } from './useClient';
import type * as Models from '.';
import { EPermission } from './chatRoomModels';

export const getChatRoomRegistry = async () => {
  const chatRoomRegistry = await client.getObject({ id: Config('ChatRoomRegistryId')!, options: { showContent: true }});
  return chatRoomRegistry;
};

export const createRoom = async (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    room: Pick<Models.ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'isEncrypted' | 'roomKey' | 'permissionInvite' | 'permissionSendMessage'>,
    userRoomKey: Uint8Array
  }
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::create_room`,
    arguments: [
      tx.object(data.userProfile.id),
      tx.object(Config('ChatRoomRegistryId')!),
      tx.pure.string(data.room.name),
      tx.pure.string(data.room.imageUrl),
      tx.pure.u64(data.room.maxParticipants),
      tx.pure.bool(data.room.isEncrypted),
      tx.pure.vector('u8', data.room.roomKey),
      tx.pure.vector('u8', data.userRoomKey),
      tx.pure.u8(data.room.permissionInvite),
      tx.pure.u8(data.room.permissionSendMessage),
      tx.object(Config('SuiClockId')!)
    ],
  });

  return tx;
  // const result = await signer.signAndExecuteTransaction(tx);
  // const chatRoom = result.objectChanges?.filter(change => change.type === 'created' && change.objectType === `${Config('PackageId')}::chat_room::ChatRoom`)?.[0];
  // return {
  //   chatRoomId: (chatRoom as any)?.objectId as string || undefined,
  //   ...result
  // };
};

export const createPublicRoom = async (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    room: Pick<Models.ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'roomKey'>
  }
) => {
  return createRoom({
    userProfile: data.userProfile,
    room: {
      ...data.room,
      ...{
        isEncrypted: false,
        permissionInvite: EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone,
        permissionSendMessage: EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone
      }
    },
    userRoomKey: new Uint8Array()
  })
};

export const createPrivateRoom = async (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    room: Pick<Models.ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'permissionInvite' | 'permissionSendMessage'>,
    userRoomKey: Uint8Array
  }
) => {
  return createRoom({
    userProfile: data.userProfile,
    room: {
      ...data.room,
      ...{
        isEncrypted: true,
        roomKey: new Uint8Array(),
      }
    },
    userRoomKey: data.userRoomKey
  })
};

export const createAnnouncementsRoom = async (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    room: Pick<Models.ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'permissionInvite'>,
    userRoomKey: Uint8Array
  }
) => {
  return createRoom({
    userProfile: data.userProfile,
    room: {
      ...data.room,
      ...{
        isEncrypted: true,
        roomKey: new Uint8Array(),
        permissionInvite: data.room.permissionInvite,
        permissionSendMessage: EPermission.Nobody
      }
    },
    userRoomKey: data.userRoomKey
  })
};

export const createDmRoom = async (
  data: {
    userProfile: Pick<Models.UserProfile, 'id'>,
    inviteeAddress: string,
    inviteeRoomKey: Uint8Array,
  }
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::create_dm_room`,
    arguments: [
      tx.object(Config('ChatRoomRegistryId')!),
      tx.object(data.userProfile.id),
      tx.pure.address(data.inviteeAddress),
      tx.pure.vector('u8', data.inviteeRoomKey),
      tx.object(Config('SuiClockId')!)
    ],
  });

  return tx;

  // const result = await signer.signAndExecuteTransaction(tx);
  // const chatRoom = result.objectChanges?.filter(change => change.type === 'created' && change.objectType === `${Config('PackageId')}::chat_room::ChatRoom`)?.[0];
  // return {
  //   chatRoomId: (chatRoom as any)?.objectId as string || undefined,
  //   ...result
  // };
};

export const acceptDmRoom = async(
  data: {
    room: Pick<Models.ChatRoom, 'id'>,
    profile: Pick<Models.UserProfile, 'id'>,
    inviterRoomKey: Uint8Array
  }
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::accept_dm_room`,
    arguments: [
      tx.object(data.room.id),
      tx.object(data.profile.id),
      tx.pure.vector('u8', data.inviterRoomKey),
      tx.object(Config('SuiClockId')!)
    ],
  });

  return tx;
};

export const getFullTable = async (field: { fields: { id: { id: string }, size: string }, type: `0x2::table::Table<${string}` }) => {

  if (!field.type.startsWith('0x2::table::Table<')) {
    throw 'Not a table ' + field.type;
  }

  let hasNextPage = true;
  let cursor: string | null = null;

  let items: { key: string, value: string, content?: any }[] = [];

  while(hasNextPage) {
    const res = await client.getDynamicFields({ parentId: field.fields.id.id, cursor });
    const rows = res.data.map(row => ({ key: row.name.value as string, value: row.objectId }));
    hasNextPage = res.hasNextPage;
    cursor = res.nextCursor;
    items.push(...rows);
  }

  for (let chunk of _.chunk(items, 50)) {
    const objs = await client.multiGetObjects({
      ids: chunk.map(item => item.value),
      options: { showContent: true }
    });

    objs.forEach((obj, index) => {
      items[index]!.content = (obj.data?.content as any)?.fields?.value?.fields;
    });
  }
  return items;
}

export const parseChatRoom = async (response: SuiObjectResponse): Promise<Models.ChatRoom> => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('ChatRoom inválido');
  }

  const fields = response.data.content.fields as any;

  const participantsTable = await getFullTable(fields.participants);

  const participants = participantsTable.reduce<Record<string, Models.ParticipantInfo>>((acc, row) => {
    acc[row.key] = {
      addedBy: row.content.added_by,
      roomKey: new Uint8Array(row.content.room_key),
      timestamp: row.content.timestamp
    };
    return acc;
  }, {});

  return {
    id: response.data.objectId,
    owner: fields.owner,
    name: fields.name,
    imageUrl: fields.image_url,
    currentBlockNumber: Number(fields.current_block_number),
    messageCount: Number(fields.message_count),
    createdAt: Number(fields.created_at),
    bannedUsers: fields.banned_users || [],
    moderators: fields.moderators || [],
    isEncrypted: fields.is_encrypted,
    maxParticipants: Number(fields.max_participants),
    participants: participants,
    roomKey: new Uint8Array(fields.room_key),
    roomType: Number(fields.room_type),
    permissionInvite: Number(fields.permission_invite),
    permissionSendMessage: Number(fields.permission_send_message)
  };
};

export const parseMessage = (response: SuiObjectResponse): Models.Message => {
    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('ChatRoom inválido');
  }

  const fields = response.data.content.fields as any;

  return {
    id: fields.id?.id,
    roomId: fields.room_id,
    blockNumber: Number(fields.block_number),
    messageNumber: Number(fields.message_number),
    sender: fields.sender,
    content: fields.content,
    mediaUrl: fields.media_url || [],
    createdAt: fields.created_at,
    replyTo: fields.reply_to,
    edited: fields.edited
  };
};

export const getAllChatRooms = async () => {
  const chatRoomRegistry = await getChatRoomRegistry();

  const roomsObjsRes = await client.multiGetObjects({
    ids: (chatRoomRegistry.data?.content as any).fields?.rooms,
    options: { showContent: true }
  });

  const rooms = await Promise.all(roomsObjsRes.map(async room => await parseChatRoom(room)));

  return rooms;
};

export const getAllUserJoinedRooms = async (userProfile: Models.UserProfile) => {
  const roomsObjsRes = await client.multiGetObjects({
    ids: userProfile.roomsJoined,
    options: { showContent: true }
  });

  const rooms = await Promise.all(roomsObjsRes.map(async room => await parseChatRoom(room)));
  return rooms;
};

export const sendMessage = async (
  userProfileId: string,
  message: Pick<Models.Message, 'content' | 'roomId'>
) => {
  const tx = new Transaction();

  const noneOptionId = tx.moveCall({
    target: '0x1::option::none',
    typeArguments: ['0x2::object::ID'],
    arguments: [],
  });

  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::send_message`,
    arguments: [
      tx.object(userProfileId),
      tx.object(message.roomId),
      tx.pure.string(message.content),
      noneOptionId,
      tx.object(Config('SuiClockId')!)
    ],
  });

  return tx;
};

export const editMessage = (
  message: Pick<Models.Message, 'id'>,
  newMessage: Pick<Models.Message, 'content'>
) => {

  const tx = new Transaction();

  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::edit_message`,
    arguments: [
      tx.object(message.id),
      tx.pure.string(newMessage.content),
    ],
  });

  return tx;
};

export const deleteMessage = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  message: Pick<Models.Message, 'id'>
) => {

  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::delete_message`,
    arguments: [
      tx.object(chatRoom.id),
      tx.object(message.id)
    ],
  });

  return tx;
};

export const inviteParticipant = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  inviteeAddress: string,
  inviteeRoomKey: Uint8Array,
) => {

  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::invite_participant`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(inviteeAddress),
      tx.pure.vector('u8', inviteeRoomKey),
      tx.object(Config('SuiClockId')!)
    ],
  });

  return tx;
};

export const addModerator = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  newModeratorAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::add_moderator`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(newModeratorAddress),
      tx.object(Config('SuiClockId')!)
    ]
  });

  return tx;
};

export const removeModerator = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  moderatorAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::remove_moderator`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(moderatorAddress),
      tx.object(Config('SuiClockId')!)
    ]
  });

  return tx;
};

export const banUser = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  userAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::ban_user`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(userAddress),
      tx.object(Config('SuiClockId')!)
    ]
  });

  return tx;
};

export const unbanUser = async (
  chatRoom: Pick<Models.ChatRoom, 'id'>,
  userAddress: string
) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${Config('PackageId')}::chat_room::unban_user`,
    arguments: [
      tx.object(chatRoom.id),
      tx.pure.address(userAddress)
    ]
  });

  return tx;
};

export const getChatRoomMessageBlocks = async (chatRoomId: string, lastBlocks: number | null = null) => {
  const chatRoom = await client.getObject({
    id: chatRoomId, options: { showContent: true }}
  );

  let hasNextPage = true;
  let cursor: string | null = null;
  let messageBlocksIds: string[] = [];

  while (hasNextPage) {

    const messageBlocksResponse = await client.getDynamicFields({
      parentId: chatRoomId,
      cursor: cursor || undefined
    });

    cursor = messageBlocksResponse.nextCursor;
    hasNextPage = messageBlocksResponse.hasNextPage;

    const messageBlocksInPage = messageBlocksResponse.data
      .filter(msgBlock => msgBlock.objectType === `${Config('PackageId')}::chat_room::MessageBlock`)
      .map(msgBlock => msgBlock.objectId);

    messageBlocksIds.push(...messageBlocksInPage);
  }

  const messageBlocksResponse = await client.multiGetObjects({
    ids: lastBlocks ? messageBlocksIds.slice(-1 * lastBlocks) : messageBlocksIds,
    options: { showContent: true }
  });

  const messageBlocks = messageBlocksResponse
    .map(msgBlock => msgBlock.data?.content as any)
    .map(msgBlock => ({
      blockNumber: msgBlock.fields.value.fields.block_number,
      messageIds: msgBlock.fields.value.fields.message_ids || []
    }));

  return messageBlocks;
};

export const getChatRoomMessagesFromBlock = async (messageBlock: Pick<Models.MessageBlock, 'messageIds'>) => {
  const messagesResponse = await client.multiGetObjects({
    ids: messageBlock.messageIds, options: { showContent: true }
  });
  const messages = messagesResponse.map(res => parseMessage(res));
  return messages;
};
