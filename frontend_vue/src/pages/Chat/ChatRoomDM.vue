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


  .q-pa-md.row.justify-end.full-width(
    style="margin-top: auto"
    v-if="youJoined"
  )
    div(style="width: 100%; max-width: 60%")
      template(v-for="msgBlock in messageBlocks")

        template(v-for="messageGroup in groupByTimestamp(messages[msgBlock.blockNumber] || [], 1)")
          q-chat-message(
            v-if="messageGroup.messages[0].sender === profile?.owner"
            :sent="true"
            bg-color="primary"
            text-color="white"
          )
            template(#avatar)
              q-avatar.q-ml-sm
                q-img(:src="profile.avatarUrl || './logo_sui_chat_bordered.png'" :ratio="1" fit="cover")

            template(#name)
              span.text-weight-bold.text-ocean {{ users[messageGroup.sender]?.username }}

            .text-body1(
              v-for="message in messageGroup.messages" :key="message.id"
              v-touch-hold.mouse="() => handleSelectMessage(message)"
              @contextmenu.prevent="() => handleSelectMessage(message)"
              @dblclick="() => handleSelectMessage(message)"
            )
              template(v-if="!message.deletedAt")
                div
                  video.fit(v-if="message.mediaUrl?.length" autoplay loop muted playisline style="max-width: 250px")
                    source(:src="message.mediaUrl[0]")

                span(v-for="(line, iLine) in message.content.split('\\n')")
                  <br v-if="iLine > 0" />
                  | {{ line }}

                template(v-if="messageSelected?.id === message.id")
                  transition-group(
                    appear
                    enter-active-class="animated flipInX slower"
                    leave-active-class="animated flipInX slower"
                  )
                    q-separator(dark spaced key="separator")
                    .flex.flex-center(key="buttons")
                      q-btn-group.bg-white(outline)
                        q-btn.bg-sea(icon="close" @click="messageSelected = null" size="md" outline)
                        q-separator(vertical)
                        q-btn.bg-sea(icon="mdi-trash-can-outline" size="md" outline @click="deleteSelectedMessage()")
                        q-separator(vertical)
                        q-btn.bg-sea(icon="mdi-pencil-outline" size="md" outline @click="editSelectedMessage()")

              //-- v-else: message deleted
              template(v-else)
                .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders(style="background: rgba(255,255,255, 0.2)")
                  | mensagem removida

            template(#stamp)
              .flex.items-center.text-caption
                q-icon.q-mr-xs(name="mdi-lock" v-if="!!messageGroup.messages.find(m => m._safe)")
                  q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
                span.text-italic {{ fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt) }}
                q-space
                q-btn.q-ml-md(icon="mdi-pound" dense size="xs" flat @click="exploreTxs(messageGroup.messages)")
                  q-tooltip Verificar transação no Suiscan

          q-chat-message(
            v-else
            bg-color="white"
            text-color="dark"
          )
            template(#avatar)
              q-avatar.q-mr-sm
                q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")

            template(#name)
              span.text-weight-bold.text-medium-sea {{ dmUser?.username }}

            .text-body1(v-for="message in messageGroup.messages" :key="message.id")
              template(v-if="!message.deletedAt")
                div
                  video.fit(v-if="message.mediaUrl?.length" autoplay loop muted playisline style="max-width: 250px")
                    source(:src="message.mediaUrl[0]")

                span(v-for="(line, iLine) in message.content.split('\\n')")
                  <br v-if="iLine > 0" />
                  | {{ line }}


              //-- v-else: message deleted
              template(v-else)
                .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders(style="background: rgba(0,0,0, 0.05)")
                  | mensagem removida

            template(#stamp)
              .flex.items-center.text-caption
                q-icon.q-mr-xs(name="mdi-lock" v-if="!!messageGroup.messages.find(m => m._safe)" color="grey")
                  q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
                span.text-italic {{ fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt) }}
                q-space
                q-btn.q-ml-md(icon="mdi-pound" dense size="xs" flat @click="exploreTxs(messageGroup.messages)")
                  q-tooltip Verificar transação no Suiscan


</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { Dialog, openURL } from 'quasar';
import { storeToRefs } from 'pinia';
import moment from 'moment';

import { useChat } from './useChat';
import { useUserStore, useUsersStore } from '../../stores';
import { type Message } from '../../move';
import { shortenAddress } from '../../utils/formatters';
import { useAsyncLoop } from '../../utils/delay';

const chatService = useChat();
const userStore = useUserStore();
const usersStore = useUsersStore();
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { activeChatRoom } = storeToRefs(chatService.chatRoomStore);
const { getChatRoomMessageBlocks, getChatRoomMessagesFromBlock, refreshUserChatRoom } = chatService.chatRoomStore;
const { getDmParticipantId, messages, messageBlocks, fetchMessages } = chatService;

const loading = ref(false);

const dmUser = computed(() => {
  if (activeChatRoom.value) {
    const participandUserId = getDmParticipantId(activeChatRoom.value);
    return users.value[participandUserId!];
  }
});
const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);
const dmUserJoined = computed(() => (dmUser.value?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);

const {} = useAsyncLoop(async (isFirstExecution) => {
  if (isFirstExecution) { loading.value = true; }
  try {
    await fetchMessages();
  } finally {
    loading.value = false;
  }
}, 5000);

const fromNow = (timestamp: number) => moment(Number(timestamp)).locale('pt-br').fromNow();

const exploreTxs = async (messages: Message[]) => {
  let txId = '';

  if (messages.length === 1) {
    txId = messages[0]?.id!;
  } else {
    txId = await new Promise(resolve => Dialog.create({
      title: 'Verificar transações',
      message: '',
      ok: {
        label: 'Abrir no Suiscan',
        color: 'medium-sea'
      },
      cancel: 'Fechar',
      options: {
        model: '',
        items: messages.map(msg => ({
          label: shortenAddress(msg.id),
          value: msg.id,
        })),
        isValid: (val) => !!val?.length
      }
    }).onOk(resolve));
  }

  if (txId) {
    openURL(`https://suiscan.xyz/devnet/object/${txId}/fields`);
  }
};

const messageSelected = ref<Message>();
const handleSelectMessage = (message: Message) => {
  messageSelected.value = message;
};

const deleteSelectedMessage = async () => {
  await chatService.deleteMessage(activeChatRoom.value!, messageSelected.value!);
};

const editSelectedMessage = async () => {
  await chatService.editMessage(messageSelected.value!, { content: '' });
};

onMounted(async () => {
  await userStore.ensurePrivateKey();
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
