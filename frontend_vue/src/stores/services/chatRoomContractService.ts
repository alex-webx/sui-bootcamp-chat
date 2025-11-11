import { Transaction } from '@mysten/sui/transactions';
import { useSuiClientStore } from '../suiClientStore';
import { useSignerContractService } from './signerContractService';
import Constants from '../../constants';
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

  const createRoom = async (userProfileId: string, room: Pick<ChatRoom, 'name' | 'imageUrl'>) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${Constants('PACKAGE_ID')}::chat_room::create_room`,
      arguments: [
        tx.object(userProfileId),
        tx.object(Constants('CHAT_ROOM_REGISTRY_ID')),
        tx.pure.string(room.name),
        tx.pure.string(room.imageUrl),
        tx.object(Constants('SUI_CLOCK_ID'))
      ],
    });

    const result = await signer.signAndExecuteTransaction(tx);
    const chatRoom = result.objectChanges?.filter(change => change.type === 'created' && change.objectType === `${Constants('PACKAGE_ID')}::chat_room::ChatRoom`)?.[0];
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
      moderators: fields.moderators || []
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
    const chatRoomRegistry = await suiClientStore.client.getObject({ id: Constants('CHAT_ROOM_REGISTRY_ID'), options: { showContent: true }});

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
      target: `${Constants('PACKAGE_ID')}::chat_room::send_message`,
      arguments: [
        tx.object(userProfileId),
        tx.object(message.roomId),
        tx.pure.string(message.content),
        noneOptionId,
        tx.object(Constants('SUI_CLOCK_ID'))
      ],
    });

    return signer.signAndExecuteTransaction(tx);
  };

  const editMessage = (message: Message, newMessage: Pick<Message, 'content'>) => {

    const tx = new Transaction();

    tx.moveCall({
      target: `${Constants('PACKAGE_ID')}::chat_room::edit_message`,
      arguments: [
        tx.object(message.editCapabilityId),
        tx.object(message.id),
        tx.pure.string(newMessage.content),
      ],
    });

    return signer.signAndExecuteTransaction(tx);
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
        .filter(msgBlock => msgBlock.objectType === `${Constants('PACKAGE_ID')}::chat_room::MessageBlock`)
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
    getAllChatRooms,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock
  };
}


// public struct ChatRoomAdminCap has key, store {
//     id: UID,
//     room_id: ID,
// }


// public struct MessageBlockEvent has copy, drop {
//     event_type: String,
//     room_id: ID,
//     block_number: u64
// }


//  public struct MessageEditCap has key, store {
//     id: UID,
//     message_id: ID,
// }

// public struct MessageEvent has copy, drop {
//     event_type: String,
//     message_id: ID,
//     room_id: ID,
//     sender: address,
// }

// public struct RoomEvent has copy, drop {
//     event_type: String,
//     room_id: ID,
//     name: String,
//     owner: address,
//     timestamp: u64
// }

// public struct UserBannedEvent has copy, drop {
//     event_type: String,
//     room_id: ID,
//     user: address,
// }

// public fun edit_message(
//     _edit_cap: &MessageEditCap,
//     message: &mut Message,
//     new_content: String,
//     ctx: &mut TxContext
// ) {
//     message.content = new_content;
//     message.edited = true;

//     event::emit(MessageEvent {
//         event_type: "edited",
//         message_id: message.id.to_inner(),
//         room_id: message.room_id,
//         sender: tx_context::sender(ctx)
//     });
// }

// public fun delete_message(
//     room: &ChatRoom,
//     message: Message,
//     messageEditCap: MessageEditCap,
//     ctx: &mut TxContext
// ) {
//     let sender = tx_context::sender(ctx);
//     let is_authorized = message.sender == sender ||
//                         room.owner == sender ||
//                         vector::contains(&room.moderators, &sender);

//     assert!(is_authorized, ENotAuthorized);

//     let message_id = message.id.uid_to_inner();
//     let room_id = message.room_id;

//     // Destruir a mensagem
//     let Message {
//         id,
//         room_id: _,
//         block_number: _,
//         message_number: _,
//         sender: _,
//         username: _,
//         content: _,
//         created_at: _,
//         reply_to: _,
//         edited: _,
//     } = message;

//     object::delete(id);

//     event::emit(MessageEvent {
//         event_type: "deleted",
//         message_id,
//         room_id,
//         sender
//     });
// }

// public fun add_moderator(
//     _admin_cap: &ChatRoomAdminCap,
//     room: &mut ChatRoom,
//     moderator: address,
//     ctx: &mut TxContext
// ) {
//     assert!(room.owner == tx_context::sender(ctx), ENotAuthorized);

//     if (!vector::contains(&room.moderators, &moderator)) {
//         vector::push_back(&mut room.moderators, moderator);
//     };
// }

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
