import { SuiObjectResponse } from '@mysten/sui/client';
import { client } from './useClient';
import type * as Models from '.';
import _ from 'lodash';

import { config, getFullTable, getMultiObjects } from './useUtils';

export const getChatRoomRegistry = async () => {
  const response = await client.getObject({ id: config('ChatRoomRegistryId')!, options: { showContent: true }});
  return parseChatRoomRegistry(response);
};

const parseChatRoomRegistry = async (response: SuiObjectResponse): Promise<Models.ChatRoomRegistry> => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('Não é um moveObject');
  }

  const fields = response.data.content.fields as { id: { id: string }, rooms: string[] };
  return {
    id: fields.id.id,
    rooms: fields.rooms
  };
};

export const parseChatRoom = async (response: SuiObjectResponse): Promise<Models.ChatRoom> => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('ChatRoom inválido');
  }

  const fields = response.data.content.fields as any;

  const participantsTable = await getFullTable(fields.participants);

  const participants = _.mapValues(participantsTable, (item: any) => ({
    addedBy: item.fields.added_by,
    roomKey: new Uint8Array(item.fields.room_key),
    timestamp: item.fields.timestamp,
    inviterKeyPub: new Uint8Array(item.fields.inviter_key_pub)
  }));

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
    editedAt: Number(fields.edited_at),
    deletedAt: Number(fields.deleted_at)
  };
};

export const getAllChatRooms = async () => {
  const chatRoomRegistry = await getChatRoomRegistry();
  const roomsObjsRes = await getMultiObjects({ ids: chatRoomRegistry.rooms });
  const rooms = await Promise.all(roomsObjsRes.map(async room => await parseChatRoom(room)));
  return rooms;
};

export const getChatRooms = async (chatRoomsIds: string[]) => {
  const roomsObjsRes = await getMultiObjects({ ids: chatRoomsIds });
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

  const messageBlocksResponse = await getMultiObjects({
    ids: lastBlocks ? messageBlocksIds.slice(-1 * lastBlocks) : messageBlocksIds
  });

  const messageBlocks = messageBlocksResponse
    .map(msgBlock => msgBlock.data?.content as any)
    .map(msgBlock => <Pick<Models.MessageBlock, 'blockNumber' | 'messageIds'>>({
      blockNumber: msgBlock.fields.value.fields.block_number as number,
      messageIds: (msgBlock.fields.value.fields.message_ids || []) as string[]
    }));

  return messageBlocks;
};

export const getChatRoomMessagesFromBlock = async (messageBlock: Pick<Models.MessageBlock, 'messageIds'>) => {
  const messagesResponse = await getMultiObjects({ ids: messageBlock.messageIds });
  const messages = messagesResponse.map(res => parseMessage(res));
  return messages;
};

export const getLastMessage = async (chatRoom: Models.ChatRoom) => {
  let latestBlockCount = 1;
  let lastMessage: Models.Message | undefined;
  let keep = true;

  while (keep) {
    const block = (await getChatRoomMessageBlocks(chatRoom.id, latestBlockCount++)).slice(0, 1)?.[0];
    if (!block) {
      keep = false;
    }
    const lastMessageId = block?.messageIds?.slice(-1)?.[0];
    if (lastMessageId) {
      const lastMessageRes = await client.getObject({ id: lastMessageId, options: { showContent: true } });
      lastMessage = parseMessage(lastMessageRes);
      keep = false;
    }
  }

  return lastMessage;
};

export const getLastMessagesFromUserChatRoomsJoined = async (profile: Models.UserProfile) => {
  const lastMessages: Record<string, Models.Message> = {};

  for (let chatRoomId of profile.roomsJoined) {
    let latestBlockCount = 1;
    let keep = true;

    while (keep) {
      const block = (await getChatRoomMessageBlocks(chatRoomId, latestBlockCount++)).slice(0, 1)?.[0];
      if (!block) {
        keep = false;
      } else {
        const lastMessageId = block?.messageIds?.slice(-1)?.[0];
        if (lastMessageId) {
          const lastMessageRes = await client.getObject({ id: lastMessageId, options: { showContent: true } });
          lastMessages[chatRoomId] = parseMessage(lastMessageRes);
          keep = false;
        }
      }
    }
  }

  return lastMessages;
};
