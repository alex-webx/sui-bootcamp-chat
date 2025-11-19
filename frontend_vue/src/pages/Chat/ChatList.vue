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
    mixin chat-room-item-content()

      //- Public Room
      ChatListItemRoom(
        v-if="room.roomType === 1"
        :room="room"
        :userAddress="profile.owner"
        :users="users"
      )

      //- DM ROOM
      ChatListItemDmRoom(
        v-else-if="room.roomType === 2"
        :room="room"
        :userAddress="profile.owner"
        :users="users"
      )

    .flex.text-center.text-dark.q-px-md.q-py-xs.text-caption.bg-grey-3
      template(v-if="chatRoomsCount === 0") Você não participa de nenhuma sala
      template(v-else-if="chatRoomsCount === 1") Você participa de 1 sala
      template(v-else) Voce participa de {{ chatRoomsCount}} salas
      q-space
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="refreshChatList()")
        q-tooltip Recarregar lista de salas

    q-item(
      v-for="(room, roomId) in chatRooms" :key="roomId"
      clickable v-ripple
      @click="selectChatRoom(room)"
      :class="{ 'active-item': roomId === activeChatRoomId }"
    )
      +chat-room-item-content

</template>
<script setup lang="ts">
import { ref, onMounted, computed, toRefs, onBeforeUnmount } from 'vue';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { useChatRoomStore, useUserStore, useUsersStore } from '../../stores';
import { useChat } from './useChat';
import { useAsyncLoop } from '../../utils/delay';
import ChatListItemDmRoom from './ChatListItemDmRoom.vue';
import ChatListItemRoom from './ChatListItemRoom.vue';

const userStore = useUserStore();
const usersStore = useUsersStore();
const chatService = useChat();
const chatRoomStore = chatService.chatRoomStore;

const { selectChatRoom } = chatService;
const { fetchAllUserChatRoom } = chatRoomStore;
const { chatRooms, activeChatRoomId } = storeToRefs(chatRoomStore);
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { fetchCurrentUserProfile } = userStore;

const chatRoomsCount = computed(() => Object.keys(chatRooms.value).length);

const loading = ref(false);

const refreshChatList = async () => {
  await fetchAllUserChatRoom();
}

</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
