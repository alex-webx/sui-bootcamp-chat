import { SuiObjectResponse } from '@mysten/sui/client';
import { client, config, getFullTable, getMultiObjects, getAllOwnedObjects } from '../../useClient';
import type * as Models from '../..';
import _ from 'lodash';

export const getChatRoomRegistry = async () => {
  const response = await client.getObject({ id: config('ChatRoomRegistryId')!, options: { showContent: true }});
  return parseChatRoomRegistry(response);
};

const parseChatRoomRegistry = async (response: SuiObjectResponse): Promise<Models.ChatRoomRegistry> => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid ChatRoomRegistry');
  }

  const fields = response.data.content.fields as { id: { id: string }, rooms: string[], dm_rooms: any };

  const dmRooms = await getFullTable(fields.dm_rooms);

  return {
    id: fields.id.id,
    rooms: fields.rooms,
    dmRooms: Object.values(dmRooms)
  };
};

export const parseRoomKey = (roomKey: any): Models.RoomKey | undefined => {
  return roomKey ? {
    encodedPrivKey: new Uint8Array(roomKey.fields.encoded_priv_key),
    iv: new Uint8Array(roomKey.fields.iv),
    pubKey: new Uint8Array(roomKey.fields.pub_key)
  } : undefined;
};

export const parseMemberInfo = (response: SuiObjectResponse): Models.MemberInfo => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid MemberInfo');
  }

  const fields = response.data.content.fields as any;

  return {
    id: String(fields.id.id),
    addedBy: String(fields.added_by),
    owner: String(fields.owner),
    roomId: String(fields.room_id),
    timestamp: Number(fields.timestamp),
    roomKey: parseRoomKey(fields.room_key)!,
  };
}

export const parseChatRoom = async (response: SuiObjectResponse, deep = true): Promise<Models.ChatRoom> => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid ChatRoom');
  }

  const fields = response.data.content.fields as any;

  const membersTable = deep ? await getFullTable(fields.members) as Record<string, string> : {};

  const moderatorsTable = deep ? await getFullTable(fields.moderators) : {};
  const moderators = _.mapValues(moderatorsTable, (item: any) => {
    const info: Models.ModeratorInfo = {
      addedBy: item.fields.added_by,
      timestamp: item.fields.timestamp,
    };
    return info;
  });

  const bannedUsersTable = deep ? await getFullTable(fields.banned_users) : {};
  const bannedUsers = _.mapValues(bannedUsersTable, (item: any) => {
    const info: Models.BanInfo = {
      bannedBy: item.fields.added_by,
      timestamp: item.fields.timestamp,
    };
    return info;
  });

  return {
    id: response.data.objectId,
    owner: fields.owner,
    name: fields.name,
    imageUrl: fields.image_url,
    messageCount: Number(fields.message_count),
    eventCount: Number(fields.event_count),
    messages: fields.messages.fields.id.id,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
    bannedUsers: bannedUsers,
    moderators: moderators,
    maxMembers: Number(fields.max_members),
    members: membersTable,
    roomType: Number(fields.room_type),
    permissionInvite: Number(fields.permission_invite),
    permissionSendMessage: Number(fields.permission_send_message)
  };
};

export const parseMessage = (response: SuiObjectResponse): Models.Message => {
  if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid Message');
  }

  const fields = response.data.content.fields as any;

  return {
    id: fields.id?.id,
    roomId: fields.room_id,
    messageNumber: Number(fields.message_number),
    eventNumber: Number(fields.event_number),
    previousVersionId: fields.previous_version_id,
    sender: fields.sender,
    content: fields.content,
    mediaUrl: fields.media_url || [],
    createdAt: fields.created_at,
    replyTo: fields.reply_to,
    editedAt: isNaN(fields.edited_at) ? undefined : Number(fields.edited_at),
    deletedAt: isNaN(fields.deleted_at) ? undefined : Number(fields.deleted_at),
    eventType: Number(fields.event_type)
  };
};

export const getUserMemberInfos = async (address: string) => {
  const res = await getAllOwnedObjects({
    owner: address,
    filter: {
      StructType: `${config('PackageId')}::chat_room::MemberInfo`
    }
  });

  const memberInfos = res.map(parseMemberInfo);
  return memberInfos;
};

export const getUsersMemberInfosById = async (membersInfosIds: string[]) => {
  const res = await getMultiObjects({ ids: membersInfosIds });

  const memberInfos = res.map(parseMemberInfo);
  return memberInfos;
};

export const getAllChatRooms = async (getRooms: boolean = true, getDmRooms: boolean = true, deep = true) => {
  const chatRoomRegistry = await getChatRoomRegistry();
  const ids = [];
  if (getRooms) { ids.push(...chatRoomRegistry.rooms); }
  if (getDmRooms) { ids.push(...chatRoomRegistry.dmRooms); }
  const roomsObjsRes = await getMultiObjects({ ids: ids });
  const rooms = await Promise.all(roomsObjsRes.map(async room => await parseChatRoom(room, deep)));
  return rooms;
};

export const getChatRooms = async (chatRoomsIds: string[], deep = true) => {
  const roomsObjsRes = await getMultiObjects({ ids: chatRoomsIds });
  const rooms = await Promise.all(roomsObjsRes.map(async room => await parseChatRoom(room, deep)));
  return rooms;
};

export const getAllMessagesIds = async (chatRoom: Models.ChatRoom) => {
  return await getFullTable(chatRoom.messages);
};

export const getAllMessages = async (messageIds: string[]) => {
  const messages = await getMultiObjects({ ids: messageIds }).then(res => res.map(obj => parseMessage(obj)));
  return messages;
};
