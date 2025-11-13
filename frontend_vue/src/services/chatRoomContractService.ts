import { Transaction } from '@mysten/sui/transactions';
import { useSuiClientStore } from '../stores/suiClientStore';
import { useSignerContractService } from './signerContractService';
import Config from '../../configs';
import { SuiObjectResponse } from '@mysten/sui/client';

export type ChatRoom = {
  id: string;
  name: string;
  imageUrl: string;
  owner: string;
  createdAt: number;
  messageCount: number;
  currentBlockNumber: number;
  bannedUsers: string[];
  moderators: string[];
  adminCapabilityId: string;
};

export type Message = {
  id: string;
  roomId: string;
  blockNumber: number;
  messageNumber: number;
  sender: string;
  content: string;
  createdAt: number;
  replyTo?: string;
  edited: boolean;
  editCapabilityId: string;
};

export type MessageBlock = {
  id: string;
  roomId: string;
  blockNumber: number;
  messageIds: string[];
  createdAt: number;
};


export function useChatRoomContractService() {

  const suiClientStore = useSuiClientStore();
  const signer = useSignerContractService();

  const getChatRoomRegistry = async () => {
    const chatRoomRegistry = await suiClientStore.client.getObject({ id: Config('ChatRoomRegistryId')!, options: { showContent: true }});
    return chatRoomRegistry;
  };

  const createRoom = async (userProfileId: string, room: Pick<ChatRoom, 'name' | 'imageUrl'>) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${Config('PackageId')}::chat_room::create_room`,
      arguments: [
        tx.object(userProfileId),
        tx.object(Config('ChatRoomRegistryId')!),
        tx.pure.string(room.name),
        tx.pure.string(room.imageUrl),
        tx.object(Config('SuiClockId')!)
      ],
    });

    const result = await signer.signAndExecuteTransaction(tx);
    const chatRoom = result.objectChanges?.filter(change => change.type === 'created' && change.objectType === `${Config('PackageId')}::chat_room::ChatRoom`)?.[0];
    return {
      chatRoomId: (chatRoom as any)?.objectId as string || undefined,
      ...result
    };
  }

  const parseChatRoom = (response: SuiObjectResponse): ChatRoom => {
    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
      throw new Error('ChatRoom inválido');
    }

    const fields = response.data.content.fields as any;
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
      adminCapabilityId: fields.admin_capability_id
    };
  };

  const parseMessage = (response: SuiObjectResponse): Message => {
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
      createdAt: fields.created_at,
      replyTo: fields.reply_to,
      edited: fields.edited,
      editCapabilityId: fields.edit_capability_id
    };
  };

  const getAllChatRooms = async () => {
    const chatRoomRegistry = await getChatRoomRegistry();

    const roomsObjsRes = await suiClientStore.client.multiGetObjects({
      ids: (chatRoomRegistry.data?.content as any).fields?.rooms,
      options: { showContent: true }
    });

    const rooms = roomsObjsRes.map(room => parseChatRoom(room));
    return rooms;
  };

  const sendMessage = async (
    userProfileId: string,
    message: Pick<Message, 'content' | 'roomId'>
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

    return signer.signAndExecuteTransaction(tx);
  };

  const editMessage = (message: Message, newMessage: Pick<Message, 'content'>) => {

    const tx = new Transaction();

    tx.moveCall({
      target: `${Config('PackageId')}::chat_room::edit_message`,
      arguments: [
        tx.object(message.editCapabilityId),
        tx.object(message.id),
        tx.pure.string(newMessage.content),
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const deleteMessage = async (chatRoom: Pick<ChatRoom, 'id'>, message: Pick<Message, 'id' | 'editCapabilityId'>) => {

    const tx = new Transaction();
    tx.moveCall({
      target: `${Config('PackageId')}::chat_room::delete_message`,
      arguments: [
        tx.object(chatRoom.id),
        tx.object(message.id)
      ],
    });

    tx.moveCall({
      target: `${Config('PackageId')}::chat_room::delete_message_edit_cap`,
      arguments: [
        tx.object(chatRoom.id),
        tx.object(message.editCapabilityId)
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const addModerator = async (chatRoom: Pick<ChatRoom, 'adminCapabilityId' | 'id'>, newModerator: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${Config('PackageId')}::chat_room::add_moderator`,
      arguments: [
        tx.object(chatRoom.adminCapabilityId),
        tx.object(chatRoom.id),
        tx.pure.string(newModerator)
      ]
    });

  };

  const getChatRoomMessageBlocks = async (chatRoomId: string, lastBlocks: number | null = null) => {
    const chatRoom = await suiClientStore.client.getObject({
      id: chatRoomId, options: { showContent: true }}
    );

    let hasNextPage = true;
    let cursor: string | null = null;
    let messageBlocksIds: string[] = [];

    while (hasNextPage) {

      const messageBlocksResponse = await suiClientStore.client.getDynamicFields({
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

    const messageBlocksResponse = await suiClientStore.client.multiGetObjects({
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

  const getChatRoomMessagesFromBlock = async (messageBlock: Pick<MessageBlock, 'messageIds'>) => {
    const messagesResponse = await suiClientStore.client.multiGetObjects({
      ids: messageBlock.messageIds, options: { showContent: true }
    });
    const messages = messagesResponse.map(res => parseMessage(res));
    return messages;
  };

  return {
    createRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    addModerator,
    getAllChatRooms,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,
    getChatRoomRegistry
  };
}

// public fun ban_user(
//     room: &mut ChatRoom,
//     user: address,
//     ctx: &mut TxContext
// ) {
//     let sender = tx_context::sender(ctx);
//     let is_authorized = room.owner == sender ||
//                         vector::contains(&room.moderators, &sender);

//     assert!(is_authorized, ENotAuthorized);

//     if (!vector::contains(&room.banned_users, &user)) {
//         vector::push_back(&mut room.banned_users, user);

//         event::emit(UserBannedEvent {
//             event_type: "banned",
//             room_id: object::uid_to_inner(&room.id),
//             user,
//         });
//     };
// }

// /// Desbanir usuário
// public fun unban_user(
//     _admin_cap: &ChatRoomAdminCap,
//     room: &mut ChatRoom,
//     user: address,
//     ctx: &mut TxContext
// ) {
//     assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);

//     let (contains, index) = vector::index_of(&room.banned_users, &user);
//     if (contains) {
//         vector::remove(&mut room.banned_users, index);

//         event::emit(UserBannedEvent {
//             event_type: "unbanned",
//             room_id: object::uid_to_inner(&room.id),
//             user,
//         });
//     };
// }
