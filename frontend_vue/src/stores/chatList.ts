import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import _, { Dictionary } from 'lodash';
import { userProfileModule, chatRoomModule } from '../move';
import type * as Models from '../move';
import { useUserStore } from './userStore';

export const useChatListStore = defineStore('chatListStore', () => {

  const userStore = useUserStore();

  const usersCache = ref<Record<string, Models.UserProfile>>({});
  const chats = ref<Record<string, Models.ChatRoom & { membersInfos: Record<string, Models.MemberInfo> }>>({});
  const activeChatId = ref('');
  const activeChat = computed(() => chats.value[activeChatId.value!]);

  const init = async (profileId: string) => {
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

  return {
    chats,
    usersCache,

    activeChat,
    activeChatId,

    init,
    refreshRooms,
    refreshRoom,

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
