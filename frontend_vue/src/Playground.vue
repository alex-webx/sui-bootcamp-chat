<template lang="pug">
q-layout.bg-ocean
  q-page-container.text-white
    q-page.column.items-center.justify-start

      q-card.q-mb-md.q-pa-md(v-for="(chat, chatId) in chats" :key="chatId" dark)
        .text-subtitle1 {{ chat.name }} #[.text-caption ({{chatId}})]
        q-btn(label="refresh" @click="loadSingle(chatId)" outline)

        div(v-for="(member, addr) in chat.members" :key="addr")
          | User address: {{addr}} - {{ usersCache[addr]?.username }} - {{chat.membersInfos[addr]}}

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useChatListStore } from './stores/chatListStore';
import { useUserStore } from './stores/userStore';
import { storeToRefs } from 'pinia';

const chatListStore = useChatListStore();

const { chats, usersCache } = storeToRefs(chatListStore);

const address = useUserStore().profile?.owner!;

onMounted(async () => {
  load();
});

const load = async () => {
  await chatListStore.init(address);
  console.log('loadig');

}

const loadSingle = async (roomId: string) => {
  await chatListStore.refreshRoom(roomId);
}

</script>
