import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref } from 'vue';
import _ from 'lodash';
import { userProfileModule, chatRoomModule, EPermission, ERoomType } from '../move';
import type * as Models from '../move';
import { useUserStore, useWalletStore } from './';
import * as encrypt from '../utils/encrypt';
import { db, useLiveQuery } from '../utils/dexie';

export const useChatListStore = defineStore('chatListStore', () => {

  const userStore = useUserStore();
  const walletStore = useWalletStore();

  const activeChatId = ref('');
  const activeChat = useLiveQuery(() => db.room.get(activeChatId.value!), [activeChatId]);

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

    const inviteObj = await encrypt.PrivateGroupService.generateInvitationKey(
      await encrypt.PrivateGroupService.generateRoomKeyMaterial(),
      profile.keyPrivDecoded!,
      profile.keyPub,
      profile.keyPub
    );

    const roomKey: Models.RoomKey = {
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
      inviteeUserProfile: Pick<Models.UserProfile, 'owner' | 'keyPub'>
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

  const inviteMember = async (args: {
    room: Pick<Models.ChatRoom, 'id'>,
    inviteeAddress: string,
    roomKey?: Models.RoomKey | undefined
  }) => {
    const tx = chatRoomModule.txInviteMember(userStore.profile!, args.room, args.inviteeAddress, args.roomKey);
    return await walletStore.signAndExecuteTransaction(tx);
  };


  return {
    activeChat,
    activeChatId,

    createChatRoom,
    createDmRoom,
    inviteMember,

    resetState: async () => {
      activeChatId.value = '';
    }
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatListStore, import.meta.hot));
}
