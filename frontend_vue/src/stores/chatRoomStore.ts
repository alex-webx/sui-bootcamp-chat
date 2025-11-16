import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { EPermission, chatRoomModule } from '../move';
import type { ChatRoom, Message, MessageBlock, UserProfile } from '../move';
import encrypt from '../utils/encrypt';
import { useUserStore, useWalletStore } from './';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const userStore = useUserStore();
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

      const tx = chatRoomModule.txCreateAnnouncementsRoom({
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

      alert('todo chatRoomModule.txCreateAnnouncementsRoom');

      return await walletStore.signAndExecuteTransaction(tx);

    } else if (roomMetaData.isPublic) {

      const tx = chatRoomModule.txCreatePublicRoom({
        userProfile: userStore.profile,
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          roomKey: new Uint8Array(),// await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
        }
      });

      alert('todo chatRoomModule.txCreatePublicRoom');

      return await walletStore.signAndExecuteTransaction(tx);
    } else {

      const tx = chatRoomModule.txCreatePrivateRoom({
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

      alert('todo chatRoomModule.txCreatePrivateRoom');

      return await walletStore.signAndExecuteTransaction(tx);
    }
  };

  const createDmRoom = async (
    data: {
      inviteeUserProfile: Pick<UserProfile, 'owner' | 'keyPub'>
    }
  ) => {
    if (userStore.profile?.id && await userStore.ensurePrivateKey()) {
      const sharedAesKey = await encrypt.deriveSharedAesKey(userStore.profile.keyPrivDecoded!, data.inviteeUserProfile.keyPub);
      const sharedKeyBytes = await window.crypto.subtle.exportKey('raw', sharedAesKey);
      const sharedKeyUint8Array = new Uint8Array(sharedKeyBytes);

      const tx = chatRoomModule.txCreateDmRoom({
        userProfile: userStore.profile,
        inviteeAddress: data.inviteeUserProfile.owner,
        inviteeRoomKey: sharedKeyUint8Array
      });

      alert('todo chatRoomModule.txCreateDmRoom');
      return await walletStore.signAndExecuteTransaction(tx);
    }
  };

  const acceptDmRoom = async (
    data: {
      room: Pick<ChatRoom, 'id'>,
      inviterUserProfile: Pick<UserProfile, 'keyPub'>
    }
  ) => {
    if (userStore.profile?.id && await userStore.ensurePrivateKey()) {
      const sharedAesKey = await encrypt.deriveSharedAesKey(userStore.profile.keyPrivDecoded!, data.inviterUserProfile.keyPub);
      const sharedKeyBytes = await window.crypto.subtle.exportKey('raw', sharedAesKey);
      const sharedKeyUint8Array = new Uint8Array(sharedKeyBytes);

      const tx = chatRoomModule.txAcceptDmRoom({
        profile: userStore.profile,
        room: data.room,
        inviterRoomKey: sharedKeyUint8Array
      });
      return walletStore.signAndExecuteTransaction(tx);
    }
  };

  const fetchAllChatRooms = async () => {
    // chatRooms.value = await chatRoomModule.getAllChatRooms();
    // return chatRooms.value;
  };

  const fetchAllUserJoinedChatRooms = async () => {
    chatRooms.value = await chatRoomModule.getAllUserJoinedRooms(userStore.profile!);
    return chatRooms.value;
  };

  const sendMessage = async (
    userProfileId: string,
    message: Pick<Message, 'content' | 'roomId'>
  ) => {
    const tx = chatRoomModule.txSendMessage(userProfileId, message);
    return await walletStore.signAndExecuteTransaction(tx);
  };

  const getChatRoomMessageBlocks = async (chatRoomId: string) => {
    return await chatRoomModule.getChatRoomMessageBlocks(chatRoomId);
  };

  const getChatRoomMessagesFromBlock = async (messageBlock: Pick<MessageBlock, 'messageIds'>) => {
    return await chatRoomModule.getChatRoomMessagesFromBlock(messageBlock);
  };

  const checkChatRoomRegistry = async() => {
    try {
      return !(await chatRoomModule.getChatRoomRegistry())?.error;
    } catch {
      return false;
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

    chatRooms,
    activeChatRoomId,
    activeChatRoom: computed(() => chatRooms.value.find(chatRoom => chatRoom.id === activeChatRoomId.value)),

    resetState: async () => {
      chatRooms.value = [];
      activeChatRoomId.value = undefined;
    }
  };
});

