import { acceptHMRUpdate, defineStore } from 'pinia';
import _ from 'lodash';
import { EPermission, ERoomType, chatRoomModule } from '../move';
import type { ChatRoom, RoomKey, Message, MessageBlock, UserProfile } from '../move';
import { PrivateGroupService } from '../utils/encrypt';
import { useUserStore, useWalletStore } from './';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const userStore = useUserStore();
  const walletStore = useWalletStore();

  const createChatRoom = async(roomMetaData: {
    name: string,
    imageUrl: string,
    maxMembers: number,
    isRestricted: boolean,
    isAnnouncements: boolean,
    inviteLevel: 'administrator' | 'moderators' | 'all'
  }) => {
    if (!userStore.profile?.id) {
      throw 'no profile';
    }

    const profile = userStore.profile;

    const roomAesKeyMaterial = await PrivateGroupService.generateRoomKeyMaterial();
    const inviteObj = await PrivateGroupService.generateWrappedKeyForRecipient(
      roomAesKeyMaterial,
      profile.keyPrivDecoded!,
      profile.keyPub,
      profile.keyPub
    );

    const roomKey: RoomKey = {
      encodedPrivKey: inviteObj.encodedAesKey,
      iv: inviteObj.iv,
      pubKey: inviteObj.inviterPublicKey
    };

    const permissionInvite = EPermission.Admin |
      (roomMetaData.inviteLevel === 'moderators' ? EPermission.Moderators : 0) |
      (roomMetaData.inviteLevel === 'all' ? (EPermission.Moderators | EPermission.Members | EPermission.Anyone) : 0);

    const permissionSendMessage = EPermission.Admin |
      (roomMetaData.isAnnouncements ? EPermission.Moderators : (EPermission.Moderators | EPermission.Members | EPermission.Anyone));

    const roomType = roomMetaData.isRestricted ? ERoomType.PrivateGroup : ERoomType.PublicGroup;

    const { tx, parser } = chatRoomModule.txCreateRoom({
      userProfile: profile,
      room: {
        name: roomMetaData.name,
        imageUrl: roomMetaData.imageUrl,
        maxMembers: roomMetaData.maxMembers,
        permissionInvite,
        permissionSendMessage,
        roomType
      },
      roomKey
    });

    return parser(await walletStore.signAndExecuteTransaction(tx));
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

  const inviteMember = async (args: {
    room: Pick<ChatRoom, 'id'>,
    inviteeAddress: string,
    roomKey?: RoomKey | undefined
  }) => {
    const tx = chatRoomModule.txInviteMember(args.room, args.inviteeAddress, args.roomKey);
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
      return !!(await chatRoomModule.getChatRoomRegistry());
    } catch {
      return false;
    }
  };

  return {
    createChatRoom,

    createDmRoom,
    // acceptDmRoom,

    sendMessage,
    editMessage,
    deleteMessage,
    inviteMember,

    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,
    checkChatRoomRegistry,

    resetState: async () => {
    }
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatRoomStore, import.meta.hot));
}
