import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { EPermission, chatRoomModule } from '../move';
import type { ChatRoom, Message, MessageBlock, UserProfile } from '../move';
import encrypt from '../utils/encrypt';
import { useUserStore } from './';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const userStore = useUserStore();

  const chatRooms = ref<ChatRoom[]>([]);
  const activeChatRoomId = ref<string>();

  const createPublicRoom = async (
    data: {
      room: Pick<ChatRoom, 'name' | 'imageUrl' | 'maxParticipants'>
    }
  ) => {
    if (userStore.profile?.id) {
      //const roomKey = await CryptService.generateSymmetricKey();

      return chatRoomModule.createPublicRoom({
        userProfile: userStore.profile,
        room: {
          ...data.room,
          roomKey: new Uint8Array(),// await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
        }
      });
    }
  };

   const createPrivateRoom = async (
    data: {
      room: Pick<ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'permissionInvite' | 'permissionSendMessage'>
    }
  ) => {
    if (userStore.profile?.id) {
      const roomKey = new Uint8Array();// await CryptService.generateSymmetricKey();

      return chatRoomModule.createPrivateRoom({
        userProfile: userStore.profile,
        room: data.room,
        userRoomKey: new Uint8Array()//await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
      });
    }
  };

  const createAnnouncementsRoom = async (
    data: {
      room: Pick<ChatRoom, 'name' | 'imageUrl' | 'maxParticipants' | 'permissionInvite'>
    }
  ) => {
    if (userStore.profile?.id) {
      const roomKey = new Uint8Array();// await CryptService.generateSymmetricKey();

      return chatRoomModule.createAnnouncementsRoom({
        userProfile: userStore.profile,
        room: data.room,
        userRoomKey: new Uint8Array()// await CryptService.encryptMessage(new Uint8Array(roomKey), userStore.profile.keyPub),
      });
    }
  };

  const createChatRoom = async(roomMetaData: {
    name: string,
    imageUrl: string,
    isEncrypted: boolean,
    maxParticipants: number,
    isPublic: boolean,
    isAnnouncements: boolean
  }) => {
    if (roomMetaData.isAnnouncements) {
      return await createAnnouncementsRoom({
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          permissionInvite: roomMetaData.isPublic ?
            (EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone) :
            (EPermission.Admin & EPermission.Moderators)
        }
      });
    } else if (roomMetaData.isPublic) {
      return await createPublicRoom({
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants
        }
      });
    } else {
      return createPrivateRoom({
        room: {
          name: roomMetaData.name,
          imageUrl: roomMetaData.imageUrl,
          maxParticipants: roomMetaData.maxParticipants,
          permissionInvite: roomMetaData.isPublic ?
            (EPermission.Admin & EPermission.Moderators & EPermission.Participants & EPermission.Anyone) :
            (EPermission.Admin & EPermission.Moderators),
          permissionSendMessage: (EPermission.Admin & EPermission.Moderators & EPermission.Participants)
        }
      })
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

      return chatRoomModule.createDmRoom({
        userProfile: userStore.profile,
        inviteeAddress: data.inviteeUserProfile.owner,
        inviteeRoomKey: sharedKeyUint8Array
      });
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

      return chatRoomModule.acceptDmRoom({
        profile: userStore.profile,
        room: data.room,
        inviterRoomKey: sharedKeyUint8Array
      });
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
    return await chatRoomModule.sendMessage(userProfileId, message);
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

