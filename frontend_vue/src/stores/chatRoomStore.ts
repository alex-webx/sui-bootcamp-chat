import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { EPermission, chatRoomModule, ERoomType } from '../move';
import type { ChatRoom, Message, MessageBlock, UserProfile } from '../move';
import { DirectMessageService } from '../utils/encrypt';
import { useUsersStore, useUserStore, useWalletStore } from './';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const userStore = useUserStore();
  const usersStore = useUsersStore();
  const walletStore = useWalletStore();

  const chatRooms = ref<ChatRoom[]>([]);
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

  const fetchAllChatRooms = async () => {
    chatRooms.value = await chatRoomModule.getAllChatRooms();
    return chatRooms.value;
  };

  const fetchAllUserJoinedChatRooms = async () => {
    chatRooms.value = await chatRoomModule.getChatRooms(userStore.profile?.roomsJoined || []);
    return chatRooms.value;
  };

  const sendMessage = async (
    room: ChatRoom,
    message: Pick<Message, 'content'>
  ) => {
    if (!userStore.profile?.id) {
      return;
    }

    if (room.roomType === ERoomType.DirectMessage) {
      const privKey = await userStore.ensurePrivateKey();
      const dmService = new DirectMessageService();
      const dmParticipantId = getDmParticipantId(room);
      const dmParticipantProfile = usersStore.users[dmParticipantId!];
      const encryptedContent = await dmService.encryptMessage(message.content, privKey!, dmParticipantProfile?.keyPub!);
      const tx = chatRoomModule.txSendMessage(userStore.profile.id, {
        content: JSON.stringify(encryptedContent),
        roomId: room.id
      });
      return await walletStore.signAndExecuteTransaction(tx);
    } else {
      throw 'todo'
      // const tx = chatRoomModule.txSendMessage(userStore.profile.id, message);
      // return await walletStore.signAndExecuteTransaction(tx);
    }
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

  const selectChatRoom = (chatRoom: typeof chatRooms.value[number]) => {
    if (activeChatRoomId.value === chatRoom.id) {
      activeChatRoomId.value = undefined;
    } else {
      activeChatRoomId.value = chatRoom.id;
    }
  };

  const getDmParticipantId = (room: (typeof chatRooms.value)[number] | null) => {
    if (room?.roomType === ERoomType.DirectMessage) {
      return Object.keys(room.participants).find(id => id !== userStore.profile?.owner)!;
    } else {
      return null;
    }
  };

  return {
    createChatRoom,

    createDmRoom,
    acceptDmRoom,

    fetchAllChatRooms,
    fetchAllUserJoinedChatRooms,

    sendMessage,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,
    checkChatRoomRegistry,
    selectChatRoom,
    getDmParticipantId,

    chatRooms,
    activeChatRoomId,
    activeChatRoom: computed(() => chatRooms.value.find(chatRoom => chatRoom.id === activeChatRoomId.value)),

    resetState: async () => {
      chatRooms.value = [];
      activeChatRoomId.value = undefined;
    }
  };
});

