<template lang="pug">
q-list
  template(v-if="loading")
    q-item(v-for="dummy of 5" :key="'dummy_' + dummy") ;
      q-item-section(avatar)
        q-skeleton(type="QAvatar" size="sm")
      q-item-section
        q-item-label(lines="1")
          q-skeleton
        q-item-label
          q-skeleton

  template(v-else)

    q-item.text-dark(
      v-for="(user, userId) in users" :key="userId"
      clickable v-ripple
      @click="selectUser(user)"
      :class="{ 'active-item': activeChatRoom && user.owner !== profile.owner && profile.roomsJoined.indexOf(activeChatRoom.id) >= 0 && !!activeChatRoom?.participants?.[user.owner] }"
    )
      q-item-section(avatar)
        q-avatar(size="48px")
          q-img(:src="user.avatarUrl" :ratio="1" fit="cover" error-src="/user-circles-set-sm.png")

      q-item-section
        q-item-label(lines="1")
          | {{ user.username }}
        q-item-label.conversation__summary(caption)
          | {{ shortenAddress(user.owner) }}
          q-badge.q-ml-sm(v-if="user.owner === profile.owner" color="medium-sea") você

      q-item-section(side)
        q-item-label(caption)
          .text-right
            div
              | entrou em
            div {{ formatDate(users.createdAt) }}
            div {{ formatTime(users.createdAt) }}

    .text-center.text-dark.q-px-sm.q-py-xs.text-caption.bg-grey-3
      | {{ usersLength }} {{usersLength > 1 ? 'usuários cadastrados' : 'usuário cadastrado'}}
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="loadUserProfiles()")
        q-tooltip Recarregar lista de usuários


  q-dialog(:modelValue="!!selectedUserId" @hide="selectedUserId = 0")
    q-card
      | {{ selectedUserId }}

</template>
<script setup lang="ts">
import { ref, onMounted, computed, toRefs } from 'vue';
import { Dialog, Notify } from 'quasar';
import { storeToRefs } from 'pinia';
import { useUsersStore, useUserStore } from '../../stores';
import formatters from '../../utils/formatters';
import { useChat } from './useChat';
import { ERoomType } from '../../move';

const usersStore = useUsersStore();
const userStore = useUserStore();
const chatService = useChat();
const chatRoomStore = chatService.chatRoomStore;

const { selectChatRoom, } = chatService;
const { chatRooms, activeChatRoom } = storeToRefs(chatRoomStore);
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { formatDate, formatTime, shortenAddress } = formatters;

const usersLength = computed(() => Object.keys(users.value!).length);
const loading = ref(false);
const selectedUserId = ref<string>();

const loadUserProfiles = async () => {
  loading.value = true;
  try {
    await usersStore.fetchAllUsersProfiles();
  } finally {
    loading.value = false;
  }
};

const selectUser = async (user: typeof users.value[number]) => {
  if (user.owner === profile.value?.owner) {
    selectedUserId.value = undefined;
    return;
  }

  let dmRoom = Object.values(chatRooms.value)
    .filter(room => room.roomType === ERoomType.DirectMessage)
    .find(room => !!room.participants[user.owner] && !!room.participants[profile.value?.owner!]);

  if (!dmRoom) {
    await chatRoomStore.fetchAllUserChatRoom();
    dmRoom = Object.values(chatRooms.value)
      .filter(room => room.roomType === ERoomType.DirectMessage)
      .find(room => !!room.participants[user.owner] && !!room.participants[profile.value?.owner!]);
  }

  if (dmRoom) {
    await selectChatRoom(dmRoom);
  } else {
    Dialog.create({
      title: `Você ainda não possui um chat com ${user.username}.`,
      message: `Deseja iniciar a conversa com ${user.username}?`,
      cancel: {
        label: 'Cancelar',
        color: 'grey',
        flat: true
      },
      ok: {
        label: 'Iniciar conversa',
        color: 'primary'
      }
    }).onOk(async () => {
      const chatRoomId = await chatRoomStore.createDmRoom({
        inviteeUserProfile: user
      });
      if (chatRoomId) {
        Notify.create({
          message: 'Sala criada com sucesso!',
          color: 'positive'
        })
        const rooms = await chatRoomStore.fetchAllUserChatRoom();
        await usersStore.fetchAllUsersProfiles([user.id]);
        await userStore.fetchCurrentUserProfile();
        const room = rooms[chatRoomId];
        if (room) {
          await selectChatRoom(room);
        }
      }
    });
  }
};

onMounted(async () => {
});
</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
