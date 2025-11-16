import _ from 'lodash';
import { Transaction } from '@mysten/sui/transactions';
import { SuiObjectResponse } from '@mysten/sui/client';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { useConfig } from '../../configs';
import { client } from './useClient';
import type * as Models from '.';
import { EPermission } from './chatRoomModels';

export const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

export const getChatRoomRegistry = async () => {
  const chatRoomRegistry = await client.getObject({ id: config('ChatRoomRegistryId')!, options: { showContent: true }});
  return chatRoomRegistry;
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
      .filter(msgBlock => msgBlock.objectType === `${config('PackageId')}::chat_room::MessageBlock`)
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
