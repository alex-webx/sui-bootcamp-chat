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
      template(v-if="myChatRooms.length === 0") Você não participa de nenhuma sala
      template(v-else-if="myChatRooms.length === 1") Você participa de 1 sala
      template(v-else) Voce participa de {{ myChatRooms.length}} salas
      q-space
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="fetchAllChatRooms()")
        q-tooltip Recarregar lista de salas

    q-item(
      v-for="room in myChatRooms" :key="room.id"
      clickable v-ripple
      @click="selectChatRoom(room)"
      :class="{ 'active-item': room.id === activeChatRoomId }"
    )
      +chat-room-item-content

    template(v-if="publicChatRooms.length > 0")
      .flex.text-center.text-dark.q-px-md.q-py-xs.text-caption.bg-grey-3
        template(v-if="publicChatRooms.length === 1") 1 sala pública
        template(v-else) {{ publicChatRooms.length}} salas pública
        q-space
        q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="fetchAllChatRooms()")
          q-tooltip Recarregar lista de salas

      q-item(
        v-for="room in publicChatRooms" :key="room.id"
        clickable v-ripple
        @click="selectChatRoom(room)"
        :class="{ 'active-item': room.id === activeChatRoomId }"
      )
        +chat-room-item-content


</template>
<script setup lang="ts">
import { ref, onMounted, computed, toRefs } from 'vue';
import { useChatRoomStore, useUserStore, useUsersStore } from '../../stores';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import ChatListItemDmRoom from './ChatListItemDmRoom.vue';
import ChatListItemRoom from './ChatListItemRoom.vue';

const chatRoomStore = useChatRoomStore();
const userStore = useUserStore();
const usersStore = useUsersStore();

const { selectChatRoom, fetchAllUserJoinedChatRooms, fetchAllChatRooms } = chatRoomStore;
const { chatRooms, activeChatRoomId } = storeToRefs(chatRoomStore);
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);

const roomsJoined = computed(() => _.keyBy(userStore.profile?.roomsJoined || [], roomId => roomId));
const myChatRooms = computed(() => chatRooms.value.filter(chatRoom => !!roomsJoined.value[chatRoom.id]));
const publicChatRooms = computed(() => chatRooms.value.filter(chatRoom => !roomsJoined.value[chatRoom.id]));
const loading = ref(true);

onMounted(() => {
  loading.value = false;
});
</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
