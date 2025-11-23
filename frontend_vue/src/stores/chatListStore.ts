import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref } from 'vue';
import _ from 'lodash';
import { userProfileModule, chatRoomModule, EPermission, ERoomType } from '../move';
import type * as Models from '../move';
import { useUserStore, useWalletStore } from './';
import * as encrypt from '../utils/encrypt';

export const useChatListStore = defineStore('chatListStore', () => {

  const userStore = useUserStore();
  const walletStore = useWalletStore();

  const usersCache = ref<Record<string, Models.UserProfile>>({});
  const chats = ref<Record<string, Models.ChatRoom & { membersInfos: Record<string, Models.MemberInfo> }>>({});
  const activeChatId = ref('');
  const activeChat = computed(() => chats.value[activeChatId.value!]);

  const init = async () => {
    await refreshRooms();
  };

   const getUserProfile = async (address: string, refresh = false) => {
    const profile = usersCache.value[address];
    if (profile && !refresh) {
      return profile;
    } else {
      const profiles = await userProfileModule.getUsersProfilesFromAddresses([address]);
      usersCache.value[address] = profiles[0]!;
      return usersCache.value[address];
    }
  };

  const getUsersProfiles = async (addresses: string[], refresh = false) => {

    if (!refresh) {
      const notCachedAddresses = addresses.filter(addr => !usersCache.value[addr]);
      const profiles = _.keyBy(await userProfileModule.getUsersProfilesFromAddresses(notCachedAddresses), profile => profile.owner);
      usersCache.value = {
        ...usersCache.value,
        ...profiles
      };
      return _.reduce(addresses, (acc, addr) => { acc[addr] = usersCache.value[addr]!; return acc; }, <typeof usersCache.value>{});
    } else {
      const profiles = _.keyBy(await userProfileModule.getUsersProfilesFromAddresses(addresses), profile => profile.owner);
      usersCache.value = {
        ...usersCache.value,
        ...profiles
      };
      return profiles;
    }
  };

  const refreshRooms = async () => {
    const roomIds = _.uniq([
      ...userStore.profile?.roomsJoined || [],
      ...await chatRoomModule.getUserMemberInfos(userStore.profile?.owner!).then(res => res.map(memberInfo => memberInfo.roomId))
    ]);

    const chatRooms = _(await chatRoomModule.getChatRooms(roomIds)).keyBy(room => room.id).value() as typeof chats.value;

    for (let room of Object.values(chatRooms)) {
      await getUsersProfiles(Object.keys(room.members));
      const membersInfos = _.keyBy(await chatRoomModule.getUsersMemberInfosById(Object.values(room.members)), memberInfo => memberInfo.owner);
      room.membersInfos = membersInfos;
    }
    chats.value = chatRooms;
    return chatRooms;
  };

  const refreshRoom = async (roomId: string) => {
    const room = (await chatRoomModule.getChatRooms([ roomId ]))[0] as typeof chats.value[number];
    await getUsersProfiles(Object.keys(room.members));
    const membersInfos = _.keyBy(await chatRoomModule.getUsersMemberInfosById(Object.values(room.members)), memberInfo => memberInfo.owner);
    room.membersInfos = membersInfos;
    chats.value[roomId] = room;
  }

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

    const roomAesKeyMaterial = await encrypt.PrivateGroupService.generateRoomKeyMaterial();
    const inviteObj = await encrypt.PrivateGroupService.generateWrappedKeyForRecipient(
      roomAesKeyMaterial,
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

  const getChatRoomMessageBlocks = async (chatRoomId: string) => {
    return await chatRoomModule.getChatRoomMessageBlocks(chatRoomId);
  };

  const getChatRoomMessagesFromBlock = async (messageBlock: Pick<Models.MessageBlock, 'messageIds'>) => {
    return await chatRoomModule.getChatRoomMessagesFromBlock(messageBlock);
  };


  return {
    chats,
    usersCache,

    activeChat,
    activeChatId,

    init,
    refreshRooms,
    refreshRoom,
    createChatRoom,
    createDmRoom,
    inviteMember,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,

    resetState: async () => {
      usersCache.value = {}
      chats.value = {};
      activeChatId.value = '';
    }
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatListStore, import.meta.hot));
}
