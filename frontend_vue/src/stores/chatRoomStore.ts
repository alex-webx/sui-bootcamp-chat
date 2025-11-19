import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import _ from 'lodash';
import { EPermission, chatRoomModule, ERoomType } from '../move';
import type { ChatRoom, Message, MessageBlock, UserProfile } from '../move';
import { DirectMessageService } from '../utils/encrypt';
import { useUsersStore, useUserStore, useWalletStore } from './';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const userStore = useUserStore();
  const usersStore = useUsersStore();
  const walletStore = useWalletStore();

  const chatRooms = ref<Record<string, ChatRoom>>({});
  const activeChatRoomId = ref<string>();

  const createChatRoom = async(roomMetaData: {
    name: string,
    imageUrl: string,
    isEncrypted: boolean,
    maxParticipants: number,
    isPublic: boolean,
    isAnnouncements: boolean
  }) => {
    if (!userStore.profile?.id) {
      throw 'no profile';
    }

    if (roomMetaData.isAnnouncements) {

      const { tx, parser } = chatRoomModule.txCreateAnnouncementsRoom({
        userProfile: userStore.profile,
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          permissionInvite: roomMetaData.isPublic ?
            (EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone) :
            (EPermission.Admin & EPermission.Moderators)
        },
        userRoomKey: new Uint8Array()// await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
      });

      return parser(await walletStore.signAndExecuteTransaction(tx));

    } else if (roomMetaData.isPublic) {

      const { tx, parser } = chatRoomModule.txCreatePublicRoom({
        userProfile: userStore.profile,
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          roomKey: new Uint8Array(),// await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
        }
      });

      return parser(await walletStore.signAndExecuteTransaction(tx));

    } else {
      //const roomKey = // await encrypt.generateSymmetricKey();

      const { tx, parser } = chatRoomModule.txCreatePrivateRoom({
        userProfile: userStore.profile,
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          permissionInvite: roomMetaData.isPublic ?
            (EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone) :
            (EPermission.Admin & EPermission.Moderators),
          permissionSendMessage: (EPermission.Admin & EPermission.Moderators & EPermission.Participants)
        },
        userRoomKey: new Uint8Array()//await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
      });
      debugger;
      return parser(await walletStore.signAndExecuteTransaction(tx));
    }
  };

  const createDmRoom = async (
    data: {
      inviteeUserProfile: Pick<UserProfile, 'owner' | 'keyPub'>
    }
  ) => {
    if (userStore.profile?.id) {
      const { tx, parser } = chatRoomModule.txCreateDmRoom({
        userProfile: userStore.profile,
        inviteeAddress: data.inviteeUserProfile.owner
      });

      return parser(await walletStore.signAndExecuteTransaction(tx));
    }
  };

  const acceptDmRoom = async (
    data: {
      room: Pick<ChatRoom, 'id'>,
      inviterUserProfile: Pick<UserProfile, 'keyPub'>
    }
  ) => {
    if (userStore.profile?.id) {
      const tx = chatRoomModule.txAcceptDmRoom({
        profile: userStore.profile,
        room: data.room
      });
      return walletStore.signAndExecuteTransaction(tx);
    }
  };

  // const fetchAllChatRooms = async () => {
  //   chatRooms.value = await chatRoomModule.getAllChatRooms();
  //   return chatRooms.value;
  // };

  const fetchAllUserChatRoom = async () => {
    const allRooms  = await chatRoomModule.getAllChatRooms();
    const roomsJoined = userStore.profile?.roomsJoined || [];
    chatRooms.value = _(allRooms)
      .filter(room => roomsJoined.indexOf(room.id) >= 0 || !!room.participants[userStore.profile?.owner!] )
      .keyBy(room => room.id).value();
    return chatRooms.value;
  };

  const refreshUserChatRoom = async (chatRoom: ChatRoom) => {
    const room  = await chatRoomModule.getChatRooms([chatRoom.id]);
    chatRooms.value[chatRoom.id] = room[0]!;
    return chatRooms.value;
  };

  const sendMessage = async (
    room: ChatRoom,
    message: Pick<Message, 'content' | 'mediaUrl' | 'replyTo'>
  ) => {
    if (!userStore.profile?.id) {
      return;
    }
    const { tx, parser } = chatRoomModule.txSendMessage(userStore.profile.id, {
      content: message.content!,
      roomId: room.id,
      replyTo: message.replyTo!,
      mediaUrl: message.mediaUrl || []
    });
    return parser(await walletStore.signAndExecuteTransaction(tx));
  };


  const deleteMessage = async (
    message: Pick<Message, 'id' | 'roomId'>) => {
    if (!userStore.profile?.id) {
      return;
    }
    const { tx, parser } = await chatRoomModule.txDeleteMessage(message);
    return parser(await walletStore.signAndExecuteTransaction(tx));
  };

  const editMessage = async (
    message: Pick<Message, 'id' | 'roomId'>,
    newMessage: Pick<Message, 'content' | 'mediaUrl'>
  ) => {
    if (!userStore.profile?.id) {
      return;
    }
    const { tx, parser } = await chatRoomModule.txEditMessage(message, newMessage);
    return parser(await walletStore.signAndExecuteTransaction(tx));
  };


  const getChatRoomMessageBlocks = async (chatRoomId: string) => {
    return await chatRoomModule.getChatRoomMessageBlocks(chatRoomId);
  };

  const getChatRoomMessagesFromBlock = async (messageBlock: Pick<MessageBlock, 'messageIds'>) => {
    return await chatRoomModule.getChatRoomMessagesFromBlock(messageBlock);
  };

  const checkChatRoomRegistry = async() => {
    try {
      return !!(await chatRoomModule.getChatRoomRegistry());
    } catch {
      return false;
    }
  };

  return {
    createChatRoom,

    createDmRoom,
    acceptDmRoom,

    fetchAllUserChatRoom,
    refreshUserChatRoom,

    sendMessage,
    editMessage,
    deleteMessage,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,
    checkChatRoomRegistry,

    chatRooms,
    activeChatRoomId,
    activeChatRoom: computed(() => chatRooms.value[activeChatRoomId.value!]),

    resetState: async () => {
      chatRooms.value = {};
      activeChatRoomId.value = undefined;
    }
  };
});

