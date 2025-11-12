<template lang="pug">
.q-pa-md.row.justify-center.full-width(
  v-if="loading"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated tada slower"
    leave-active-class="animated tada slower"
  )
    .flex.flex-center.column
      img(src="/logo_sui_chat_bordered.png" style="width: 200px; opacity: 1;")

.q-pa-md.row.justify-end.full-width(
  style="margin-top: auto"
  v-else
)
  div(style="width: 100%; max-width: 60%")
    template(v-for="msgBlock in messageBlocks")

      template(v-for="messageGroup in groupByTimestamp(messages[msgBlock.blockNumber] || [], 1)")
        q-chat-message(
          v-if="messageGroup.messages[0].sender === profile?.owner"
          :avatar="profile.avatarUrl || './logo_sui_chat_bordered.png'"
          :stamp="fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt)"
          :sent="true"
          bg-color="primary"
          text-color="white"
        )
          template(#name)
            | {{ addressToProfileMap[messageGroup.sender]?.username }}
            q-badge.q-ml-sm.q-mb-xs(
              v-if="messageGroup.sender === activeChatRoom.owner"
              color="medium-sea" outline
            ) admin

          div(v-for="message in messageGroup.messages")
            span(v-for="(line, iLine) in message.content.split('\\n')")
              <br v-if="iLine > 0" />
              | {{ line }}

        q-chat-message(
          v-else
          :stamp="fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt)"
          :avatar="addressToProfileMap[messageGroup.sender]?.avatarUrl || '/user-circles-set-sm.png'"
          bg-color="white"
          text-color="dark"
        )
          template(#name)
            | {{ addressToProfileMap[messageGroup.sender]?.username }}
            q-badge.q-ml-sm.q-mb-xs(
              v-if="messageGroup.sender === activeChatRoom.owner"
              color="medium-sea" outline
            ) admin

          div(v-for="message in messageGroup.messages")
            span(v-for="(line, iLine) in message.content.split('\\n')")
              <br v-if="iLine > 0" />
              | {{ line }}

</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useChatRoomStore } from '../../stores/chatRoomStore';
import { useUserStore } from '../../stores/userStore';
import { useUsersStore } from '../../stores/usersStore';
import { useSuiClientStore } from '../../stores/suiClientStore';
import moment from 'moment';
import 'moment/dist/locale/pt-br';

const route = useRoute();
const chatRoomStore = useChatRoomStore();
const userStore = useUserStore();
const usersStore = useUsersStore();
const suiClientStore = useSuiClientStore();
const { activeChatRoom } = storeToRefs(chatRoomStore);
const { profile } = storeToRefs(userStore);
const { addressToProfileMap } = storeToRefs(usersStore);

const messageBlocks = ref<Awaited<ReturnType<typeof chatRoomStore.getChatRoomMessageBlocks>>>();
const messages = ref<Record<string, Awaited<ReturnType<typeof chatRoomStore.getChatRoomMessagesFromBlock>>>>({});
const loading = ref(false);

const fromNow = (timestamp: number) => moment(Number(timestamp)).locale('pt-br').fromNow();

const fetchMessages = async () => {
  if (activeChatRoom.value?.id) {
    messageBlocks.value = await chatRoomStore.getChatRoomMessageBlocks(activeChatRoom.value.id);
    if (messageBlocks.value.length) {
      for (let messageBlock of messageBlocks.value) {
        messages.value[messageBlock.blockNumber] = await chatRoomStore.getChatRoomMessagesFromBlock(messageBlock);
      }
    }
  }
};

defineExpose({ fetchMessages });

let timeout = 0;

onMounted(async () => {
  const loop = async () => {
    console.log('fetching');
    await fetchMessages();
    timeout = setTimeout(loop, 5000) as any;
  };

  loading.value = true;
  try {
    await loop();
  } finally {
    loading.value = false;
  }
});
onBeforeUnmount(() => {
  clearTimeout(timeout);
});


const groupByTimestamp = (messages: any[], minutes: number) => {
  if (messages.length === 0) return [];

  const limiteMs = minutes * 60 * 1000;
  const groups: { timestamp: number; sender: string, messages: any[] }[] = [];

  let currentGroup = { timestamp: messages[0].timestamp, sender: messages[0].sender, messages: [ messages[0] ] };

  for (let i = 1; i < messages.length; i++) {
    const diff = messages[i].createdAt - currentGroup.timestamp;

    if (diff <= limiteMs && messages[i].sender === currentGroup.sender) {
      currentGroup.messages.push(messages[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = { timestamp: messages[i].createdAt, sender: messages[i].sender, messages: [ messages[i] ] };
    }
  }

  groups.push(currentGroup);
  return groups;
};

</script>
<style lang="scss" scoped>
$chat-message-border-radius: 12px;
.q-message :deep(.q-message-text--received) {
  border-radius: $chat-message-border-radius $chat-message-border-radius $chat-message-border-radius 0 !important;
}
.q-message :deep(.q-message-text--sent) {
  border-radius: $chat-message-border-radius $chat-message-border-radius 0 $chat-message-border-radius !important;
}
</style>
