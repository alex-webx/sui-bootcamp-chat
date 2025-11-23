<template lang="pug">
q-list.text-dark
  template(v-if="loading")
    q-item(v-for="dummy of 3" :key="'dummy_' + dummy")
      q-item-section(avatar)
        q-skeleton(type="QAvatar" size="sm")
      q-item-section
        q-item-label(lines="1")
          q-skeleton
        q-item-label
          q-skeleton

  template(v-else)
    .flex.text-center.text-dark.q-px-md.q-py-xs.text-caption.bg-grey-3
      template(v-if="chatRoomsCount === 0") Você não participa de nenhuma sala
      template(v-else-if="chatRoomsCount === 1") Você participa de 1 sala
      template(v-else) Voce participa de {{ chatRoomsCount}} salas
      q-space
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="refreshChatList()")
        q-tooltip Recarregar lista de salas

    q-item(
      v-for="(room, roomId) in chats" :key="roomId"
      clickable v-ripple
      @click="selectChatRoom(room)"
      :class="{ 'active-item': roomId === activeChatId }"
    )
      //- Public/Private Room
      ChatListItemRoom(
        v-if="room.roomType === 1 || room.roomType === 2"
        :room="room"
        :userAddress="profile.owner"
      )

      //- DM ROOM
      ChatListItemDmRoom(
        v-else-if="room.roomType === 3"
        :room="room"
        :userAddress="profile.owner"
      )

</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { useUserStore, useChatListStore } from '../../stores';
import { useChat } from './useChat';
import ChatListItemDmRoom from './ChatListItemDmRoom.vue';
import ChatListItemRoom from './ChatListItemRoom.vue';
import type { ChatRoom } from '../../move';

const userStore = useUserStore();
const chatService = useChat();
const chatListStore = useChatListStore();

const { chats, activeChatId } = storeToRefs(chatListStore);

const { profile } = storeToRefs(userStore);

const chatRoomsCount = computed(() => Object.keys(chats.value).length);

const loading = ref(false);

const selectChatRoom = async (chatRoom: ChatRoom) => {
  await chatService.selectChatRoom(chatRoom);
};

const refreshChatList = async () => {
  await userStore.fetchCurrentUserProfile();
  await chatListStore.refreshRooms();
}

</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
