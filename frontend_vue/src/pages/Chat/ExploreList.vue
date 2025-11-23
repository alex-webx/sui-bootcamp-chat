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

    .text-center.text-dark.q-px-sm.q-py-xs.text-caption.bg-grey-3
      | {{ allUsers.length }} {{allUsers.length > 1 ? 'usuários' : 'usuário'}} e
      | {{ allPublicRooms.length }} {{allPublicRooms.length > 1 ? 'salas públicas' : 'sala pública'}}
      | cadastrados
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="reload()")
        q-tooltip Recarregar

    q-item
      q-item-section
        q-input(
          v-model="searchText"
          outlined label="Nome do usuário, nome da sala pública, endereço..."
          :debounce="500" autofocus clearable dense
        )

    //-------- USUÁRIOS --------

    q-item.text-dark(
      v-for="(user, userId) in filteredUsers" :key="userId"
      clickable v-ripple
      @click="selectUser(user)"
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
            div {{ formatDate(user.createdAt) }}
            div {{ formatTime(user.createdAt) }}


    //-------- SALAS PÚBLICAS --------
    q-item.text-dark(
      v-for="(room, roomId) in filteredPublicRooms" :key="roomId"
      clickable v-ripple
      @click="selectRoom(room)"
    )
      q-item-section(avatar)
        q-avatar(size="48px")
          q-img(:src="room.imageUrl" :ratio="1" fit="cover" error-src="/user-circles-set-sm.png")

      q-item-section
        q-item-label(lines="1")
          | {{ room.name }}
        q-item-label.conversation__summary(caption)
          | {{ Object.keys(room.members).length }} {{ Object.keys(room.members).length > 1 ? 'membros' : 'membro' }}

      q-item-section(side)
        q-item-label(caption)
          .text-right
            div
              | criada em
            div {{ formatDate(room.createdAt) }}
            div {{ formatTime(room.createdAt) }}

</template>
<script setup lang="ts">
import { ref, onMounted, computed, toRefs } from 'vue';
import { Dialog, Notify } from 'quasar';
import { storeToRefs } from 'pinia';
import { useChatListStore, useUserStore } from '../../stores';
import { formatDate, formatTime, shortenAddress } from '../../utils/formatters';
import { containsText } from '../../utils/textsearch';
import { useChat } from './useChat';
import { type ChatRoom, ERoomType, type UserProfile, userProfileModule, chatRoomModule } from '../../move';

const userStore = useUserStore();
const chatService = useChat();
const chatListStore = useChatListStore();

const { selectChatRoom } = chatService;
const { profile } = storeToRefs(userStore);

const searchText = ref('');

const loading = ref(false);
const selectedUserId = ref<string>();

const allUsers = ref<UserProfile[]>([]);
const allPublicRooms = ref<ChatRoom[]>([]);

const filteredUsers = computed(() => {
  if (!searchText.value) { return []; }
  return allUsers.value.filter(user => containsText(user.username, searchText.value) || searchText.value === user.owner);
});

const filteredPublicRooms = computed(() => {
  if (!searchText.value) { return []; }
  return allPublicRooms.value.filter(room => containsText(room.name, searchText.value) || searchText.value === room.id);
});

const reload = async () => {
  loading.value = true;
  try {
    allUsers.value = (await userProfileModule.getAllUsersProfiles()).filter(user => user.owner !== profile.value?.owner);
    allPublicRooms.value = (await chatRoomModule.getAllChatRooms()).filter(room => room.roomType === ERoomType.PublicGroup);
  } finally {
    loading.value = false;
  }
};

const selectUser = async (user: UserProfile) => {
  selectedUserId.value = await chatService.selectUser(user);
}

const selectRoom = async (room: ChatRoom) => {
  const matchedRoom = chatListStore.chats[room.id]?.id;

  if (matchedRoom) {
    await chatService.selectChatRoom(room);
    return;
  }

  Dialog.create({
    title: 'Você ainda não é membro desta sala.',
    message: 'Gostaria de entrar e fazer parte?',
    ok: {
      label: 'Sim',
      color: 'primary'
    },
    cancel: {
      label: 'Cancelar',
      color: 'grey',
      flat: true
    }
  }).onOk(async () => {
    const notif = Notify.create({
      message: 'Entrando na sala...',
      caption: 'Assine a transação em sua carteira',
      group: false,
      spinner: true,
      timeout: 0,
      color: 'primary'
    });

    try {
      await chatListStore.inviteMember({
        room: room,
        inviteeAddress: profile.value?.owner!
      });
      await userStore.fetchCurrentUserProfile();
      await chatListStore.refreshRoom(room.id);
      await chatService.selectChatRoom(room);

      notif({
        message: 'Você entrou na sala!',
        caption: '',
        spinner: false,
        timeout: 2500,
        icon: 'done',
        color: 'positive'
      })
    } catch(ex) {
      console.log(ex);
      notif({
        message: 'Erro ao tentar acessar a sala',
        caption: '',
        timeout: 5000,
        spinner: false,
        color: 'negative'
      });
    }
  });
};

onMounted(async () => {
  await reload();
});
</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
