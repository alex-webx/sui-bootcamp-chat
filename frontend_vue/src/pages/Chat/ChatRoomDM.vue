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
          :sent="true"
          bg-color="primary"
          text-color="white"
        )
          template(#avatar)
            q-avatar.q-ml-sm
              q-img(:src="profile.avatarUrl || './logo_sui_chat_bordered.png'" :ratio="1" fit="cover")

          template(#name)
            | {{ users[messageGroup.sender]?.username }}
            q-badge.q-ml-sm.q-mb-xs(
              v-if="messageGroup.sender === activeChatRoom.owner"
              color="medium-sea" outline
            ) admin

          .text-body1(v-for="message in messageGroup.messages")
            span(v-for="(line, iLine) in message.content.split('\\n')")
              <br v-if="iLine > 0" />
              | {{ line }}

          template(#stamp)
            .flex.items-center.text-caption
              q-icon.q-mr-xs(name="mdi-lock" v-if="!!messageGroup.messages.find(m => m._safe)")
                q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
              span.text-italic {{ fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt) }}

        q-chat-message(
          v-else
          bg-color="white"
          text-color="dark"
        )
          template(#avatar)
            q-avatar.q-mr-sm
              q-img(:src="users[messageGroup.sender]?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")

          template(#name)
            | {{ users[messageGroup.sender]?.username }}
            q-badge.q-ml-sm.q-mb-xs(
              v-if="messageGroup.sender === activeChatRoom.owner"
              color="medium-sea" outline
            ) admin

          .text-body1(v-for="message in messageGroup.messages")
            span(v-for="(line, iLine) in message.content.split('\\n')")
              <br v-if="iLine > 0" />
              | {{ line }}

          template(#stamp)
            .flex.items-center.text-caption
              q-icon.q-mr-xs(name="mdi-lock" v-if="!!messageGroup.messages.find(m => m._safe)" color="grey")
                q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
              span.text-italic {{ fromNow(messageGroup.messages[messageGroup.messages.length - 1].createdAt) }}

.q-pa-md.row.justify-center.full-width(
  v-if="activeChatRoom.messageCount === 0"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated zoomInDown slower"
    leave-active-class="animated zoomInDown slower"
  )
    slot(name="empty")

</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useChatRoomStore } from '../../stores/chatRoomStore';
import { useUserStore } from '../../stores/userStore';
import { useUsersStore } from '../../stores/usersStore';
import moment from 'moment';
import { DirectMessageService } from '../../utils/encrypt';

const route = useRoute();
const chatRoomStore = useChatRoomStore();
const userStore = useUserStore();
const usersStore = useUsersStore();
const { activeChatRoom } = storeToRefs(chatRoomStore);
const { users } = storeToRefs(usersStore);
const { getDmParticipantId } = chatRoomStore;

const dmService = new DirectMessageService();

const messageBlocks = ref<Awaited<ReturnType<typeof chatRoomStore.getChatRoomMessageBlocks>>>([]);
const messages = ref<Record<string, Awaited<ReturnType<typeof chatRoomStore.getChatRoomMessagesFromBlock>>>>({});
const loading = ref(false);

const fromNow = (timestamp: number) => moment(Number(timestamp)).locale('pt-br').fromNow();

const decryptMessage = async (jsonMessage: string) => {
  const message = JSON.parse(jsonMessage) as { iv: string, ciphertext: string };
  await userStore.ensurePrivateKey();
  if (message.ciphertext && message.iv) {
    try {
      const decrypted = await dmService.decryptMessage({
        ciphertext: message.ciphertext,
        iv: message.iv,
        recipientPrivateKey: userStore.profile?.keyPrivDecoded!,
        senderPublicKeyBytes: users.value[getDmParticipantId(activeChatRoom.value!)!]?.keyPub!
      });
      return decrypted;
    } catch (e) {
      return '[conteúdo protegido]';
    }
  } else {
    return jsonMessage;
  }
}

const fetchMessages = async () => {
  if (activeChatRoom.value?.id) {
    messageBlocks.value = await chatRoomStore.getChatRoomMessageBlocks(activeChatRoom.value.id);
    if (messageBlocks.value.length) {
      for (let messageBlock of messageBlocks.value) {
        const res = await chatRoomStore.getChatRoomMessagesFromBlock(messageBlock);
        for (let msg of res) {
          try {
            msg.content = await decryptMessage(msg.content);
            (msg as any)._safe = true;
          } catch { }
        }
        messages.value[messageBlock.blockNumber] = res
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

  await userStore.ensurePrivateKey();
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
