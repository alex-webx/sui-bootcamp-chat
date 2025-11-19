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

template(v-else)

  .q-pa-md.row.justify-center.full-width(
    v-if="dmUser && !dmUserJoined"
    style="margin-top: auto; margin-bottom: auto"
  )
    transition(
      appear
      enter-active-class="animated zoomIn slower"
      leave-active-class="animated zoomInDown slower"
    )
      q-card.rounded.text-center(style="max-width: 360px")
        .flex.flex-center.column.q-ma-lg
          .relative-position
            q-avatar.q-mt-xl(size="100px")
              q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
            div(style="position: absolute; top: 25px; right: -40px")
              q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
          q-card-section.text-body1
            | #[span.text-weight-bold {{ dmUser?.username }}] ainda não aceitou o seu convite

  .q-pa-md.row.justify-center.full-width(
    v-else-if="dmUser && !youJoined"
    style="margin-top: auto; margin-bottom: auto"
  )
    transition(
      appear
      enter-active-class="animated zoomIn slower"
      leave-active-class="animated zoomInDown slower"
    )
      q-card.rounded.text-center(style="max-width: 360px")
        .flex.flex-center.column.q-ma-lg
          .relative-position
            q-avatar.q-mt-xl(size="100px")
              q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
          q-card-section.text-body1
            div Você ainda não aceitou o convite de #[span.text-weight-bold {{ dmUser?.username }}]


          q-card.rounded.bg-grey-2(flat bordered)
            q-card-section.text-italic.text-caption Envie uma mensagem para iniciar a conversa!


  .q-pa-md.row.justify-center.full-width(
    v-else-if="activeChatRoom.messageCount === 0"
    style="margin-top: auto; margin-bottom: auto"
  )
    transition(
      appear
      enter-active-class="animated zoomIn slower"
      leave-active-class="animated zoomInDown slower"
    )
      q-card.rounded.text-center(style="max-width: 360px")
        .flex.flex-center.column.q-ma-lg
          .relative-position
            q-avatar.q-mt-xl(size="100px")
              q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
            div(style="position: absolute; top: 25px; right: -40px")
              q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
          q-card-section.text-body1
            | #[span.text-weight-bold Você e {{ dmUser?.username }}] ainda não trocaram mensagens


  .row.justify-end(
    v-if="youJoined"
    style="margin-top: auto"
  )
    //- q-virtual-scroll.content-end(
    //-   :style=`{ width: '100%', maxWidth: '800px', maxHeight: desktopMode ? 'calc(-140px + 100vh)' : '100vh', padding: '16px 0 8px 0' }`
    //-   :items="messageBlocks"
    //-   v-slot="{ item: msgBlock, index }"
    //-   ref="virtualScroll"
    //- )
    .q-px-md.full-width(v-for="msgBlock in messageBlocks")
      q-chat-message(
        :label="'Block Number #' + msgBlock.blockNumber + ' (' + msgBlock.messageIds.length + ')'"
      )

      MessageBlock(
        :messageBlock="msgBlock"
        :user="profile"
        :dmUser="dmUser"
        @messagesLoaded="() => messagesEvent('loaded')"
        @messagesChanged="() => messagesEvent('changed')"
      )

  div(ref="bottomChatElement")

</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useChat } from '../useChat';
import { useUserStore, useUsersStore } from '../../../stores';
import { useAsyncLoop } from '../../../utils/delay';
import MessageBlock from './MessageBlock.vue';

const chatService = useChat();
const userStore = useUserStore();
const usersStore = useUsersStore();
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { activeChatRoom } = storeToRefs(chatService.chatRoomStore);
const { getChatRoomMessageBlocks, getChatRoomMessagesFromBlock, refreshUserChatRoom } = chatService.chatRoomStore;
const {
  getDmParticipantId, messages, messageBlocks, bottomChatElement, scrollTo, fetchMessageBlocks,
  breakpoint, screenWidth, desktopMode, drawerWidth
} = chatService;


const loading = ref(false);

const dmUser = computed(() => {
  if (activeChatRoom.value) {
    const participandUserId = getDmParticipantId(activeChatRoom.value);
    return users.value[participandUserId!];
  }
});
const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);
const dmUserJoined = computed(() => (dmUser.value?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);

onMounted(async () => {
  await userStore.ensurePrivateKey();
});

useAsyncLoop(async isFirstExecution => {
  if (isFirstExecution) {
    loading.value = true;
  }

  try {
    await fetchMessageBlocks();
  } catch {}

  if (isFirstExecution) {
    loading.value = false;
  }

}, 1000, true);

const messagesEvent = async (type: 'loaded' | 'changed') => {
  if (type === 'loaded') {
    scrollTo('bottom');
  }
};

// const groupByTimestamp = (messages: any[], minutes: number) => {
//   if (messages.length === 0) return [];

//   const limiteMs = minutes * 60 * 1000;
//   const groups: { timestamp: number; sender: string, messages: any[] }[] = [];

//   let currentGroup = { timestamp: messages[0].timestamp, sender: messages[0].sender, messages: [ messages[0] ] };

//   for (let i = 1; i < messages.length; i++) {
//     const diff = messages[i].createdAt - currentGroup.timestamp;

//     if (diff <= limiteMs && messages[i].sender === currentGroup.sender) {
//       currentGroup.messages.push(messages[i]);
//     } else {
//       groups.push(currentGroup);
//       currentGroup = { timestamp: messages[i].createdAt, sender: messages[i].sender, messages: [ messages[i] ] };
//     }
//   }

//   return groups;
// };

</script>
<style lang="scss" scoped>
</style>
