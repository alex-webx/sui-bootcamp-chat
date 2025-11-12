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
      q-item-section(avatar)
        q-avatar
          img(:src="room.imageUrl || '/logo_sui_chat.png'")

      q-item-section
        q-item-label(lines="1") {{ room.name }}
        q-item-label(caption)
          | todo

      q-item-section(side)
        q-item-label(caption)
          | todo
        q-icon(name="keyboard_arrow_down")

    .flex.text-center.text-dark.q-px-md.q-py-xs.text-caption.bg-grey-3
      template(v-if="myChatRooms.length === 0") Você não participa de nenhuma sala
      template(v-else-if="myChatRooms.length === 1") Você participa de 1 sala
      template(v-else) Voce participa de {{ myChatRooms.length}} salas
      q-space
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="loadChatRooms()")
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
        q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="loadChatRooms()")
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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useChatRoomStore } from '../../stores/chatRoomStore';
import _ from 'lodash';
import { useUserStore } from '../../stores/userStore';

const router = useRouter();
const chatRoomStore = useChatRoomStore();
const userStore = useUserStore();
const { chatRooms, activeChatRoomId } = storeToRefs(chatRoomStore);
const roomsJoined = computed(() => _.keyBy(userStore.profile?.roomsJoined || [], roomId => roomId));
const myChatRooms = computed(() => chatRooms.value.filter(chatRoom => !!roomsJoined.value[chatRoom.id]));
const publicChatRooms = computed(() => chatRooms.value.filter(chatRoom => !roomsJoined.value[chatRoom.id]));
const loading = ref(true);

const selectChatRoom = (chatRoom: typeof chatRooms.value[number]) => {
  if (activeChatRoomId.value === chatRoom.id) {
    activeChatRoomId.value = undefined;
  } else {
    activeChatRoomId.value = chatRoom.id;
  }
}

const loadChatRooms = async () => {
  loading.value = true;
  try {
    await chatRoomStore.fetchChatRooms();
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadChatRooms();
});
</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
