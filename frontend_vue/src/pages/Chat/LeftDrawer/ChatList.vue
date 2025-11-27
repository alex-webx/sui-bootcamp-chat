<template lang="pug">
q-list.text-dark
  template(v-if="loading || !rooms")
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
      template(v-if="rooms.length === 0") Você não participa de nenhuma sala
      template(v-else-if="rooms.length === 1") Você participa de 1 sala
      template(v-else) Voce participa de {{ rooms.length }} salas
      q-space
      //- q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="refreshChatList()")
      //-   q-tooltip Recarregar lista de salas


    ChatListItem(
      v-for="room in rooms" :key="room.id"
      clickable v-ripple
      :class="{ 'active-item': room.id === 'TODO' }"
      :room="room"
    )

</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { useUserStore, useChatListStore } from '../../../stores';
import { useChat } from '../useChat';
import ChatListItem from './ChatListItem.vue';
import { type ChatRoom, ERoomType } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';

const userStore = useUserStore();
// const chatService = useChat();
// const chatListStore = useChatListStore();

// const { chats, activeChatId } = storeToRefs(chatListStore);

const { profile } = storeToRefs(userStore);

const rooms = useLiveQuery(() => db.room.toArray());
const loading = ref(false);

const refreshChatList = async () => {
  // await userStore.fetchCurrentUserProfile();
  // await chatListStore.refreshRooms();
}

</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
