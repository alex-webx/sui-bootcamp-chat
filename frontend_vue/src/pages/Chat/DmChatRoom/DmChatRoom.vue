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
    .q-px-md.full-width(v-for="(msgBlock, msgBlockIndex) in messageBlocks" :key="msgBlock.id")

      .flex.full-width.flex-center.q-mb-md.block-separator(
        v-if="msgBlockIndex === (messageBlocks.length - messageBlockLoadCount - 1)"
      )
        q-btn.full-width(
          @click="messageBlockLoadCount++" flat stack icon="mdi-chevron-up"
          label="carregar mais mensagens" color="grey-7"
        )

      template(v-if="msgBlockIndex >= (messageBlocks.length - messageBlockLoadCount)")

        .text-center.full-width.q-py-md(
          v-if="msgBlockIndex === 0"
        )
          q-chip(color="deep-sea" dark) início da conversa com {{ dmUser.username }}

        MessageBlock(
          :messageBlock="msgBlock"
          :user="profile"
          :dmUser="dmUser"
          @messagesLoaded="(blockNumber) => messagesEvent('loaded', blockNumber)"
          @messagesChanged="(blockNumber) => messagesEvent('changed', blockNumber)"
          :enabledLoading="msgBlockIndex >= (messageBlocks.length - messageBlockLoadCount)"
        )

  div(ref="bottomChatElement")

</template>

<script lang="ts" setup>
import { computed, watch, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useChat } from '../useChat';
import { useUserStore, useUsersStore } from '../../../stores';
import { useMessageFeeder } from '../useMessageFeeder';
import MessageBlock from './MessageBlock.vue';

const chatService = useChat();
const userStore = useUserStore();
const usersStore = useUsersStore();
const feeder = useMessageFeeder();
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { activeChatRoom } = storeToRefs(chatService.chatRoomStore);
const {
  getDmParticipantId, messages, messageBlocks, messageBlockLoadCount, fetchMessageBlocks, bottomChatElement, scrollTo,
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
  loading.value = true;
  await userStore.ensurePrivateKey();
  loading.value = false;
});

const messagesEvent = async (type: 'loaded' | 'changed', blockNumber: number) => {
  if (type === 'loaded' && blockNumber === messageBlocks.value.slice(-1)[0]?.blockNumber) {
    console.log('messagesEvent scroll to bottom') ;
    scrollTo('bottom');
  }
};

watch(() => feeder.latestMessageBlocks.value[activeChatRoom.value?.id!], async () => {
  await fetchMessageBlocks();
}, { immediate: true });

</script>
<style lang="scss" scoped>
.block-separator {
  background: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba($ocean, 0.06) 40%, rgba($ocean, 0.06) 60%,  rgba(0, 0, 0, 0) 100%);
}
</style>
