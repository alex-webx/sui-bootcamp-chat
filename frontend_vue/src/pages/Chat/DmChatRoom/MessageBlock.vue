<template lang="pug">
.flex.flex-center.full-width.q-pb-md(v-if="firstExecution && loading")
  q-spinner-dots(size="30px" color="grey-7")
  q-spinner-dots(size="30px" color="grey-7")
  q-spinner-dots(size="30px" color="grey-7")

.q-px-md(
  v-for="(message, msgIndex) in messages" :key="message.id"
)
  MessageUser(
    v-if="message.sender === user.owner"
    :user="props.user" :dmUser="props.dmUser"
    :message="message"
    :isFirst="message.sender !== messages[msgIndex - 1]?.sender"
    :isLast="message.sender !== messages[msgIndex + 1]?.sender"
  )
  MessageDmUser(
    v-else
    :user="props.user" :dmUser="props.dmUser"
    :message="message"
    :isFirst="message.sender !== messages[msgIndex - 1]?.sender"
    :isLast="message.sender !== messages[msgIndex + 1]?.sender"
  )

div(ref="bottomMessageBlockElement")

</template>
<script setup lang="ts">
import { nextTick, ref, computed,type PropType, watch } from 'vue';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { useChatRoomStore, useUserStore, useUsersStore } from '../../../stores';
import { useChat } from '../useChat';
import { useAsyncLoop } from '../../../utils/delay';
import { type MessageBlock, type Message, type UserProfile, chatRoomModule } from '../../../move';
import { DirectMessageService } from '../../../utils/encrypt';
import MessageUser from './MessageUser.vue';
import MessageDmUser from './MessageDmUser.vue';

const props = defineProps({
  messageBlock: {
    type: Object as PropType<MessageBlock>,
    required: true
  },
  user: {
    type: Object as PropType<UserProfile>,
    required: true
  },
  dmUser: {
    type: Object as PropType<UserProfile>,
    required: true
  },
  enabledLoading: {
    type: Boolean
  }
});

const emits = defineEmits<{
  (e: 'messagesLoaded', blockNumber: number): void,
  (e: 'messagesChanged', blockNumber: number): void
}>();

const bottomMessageBlockElement = ref();
const firstExecution = ref(true);
const loading = ref(false);
const messages = ref<Message[]>([]);
const decryptService = computed(() => {
  const privKey = props.user?.keyPrivDecoded!;
  const dmUserPubKey =  props.dmUser.keyPub;
  const dmService = new DirectMessageService(privKey, dmUserPubKey);
  return dmService;
});

const loadMessages = async() => {
  if (props.enabledLoading) {
    loading.value = true;

    const msgs = await chatRoomModule.getChatRoomMessagesFromBlock(props.messageBlock);

    for (let msg of msgs) {
      if (msg.content) {
        try {
          const content = JSON.parse(msg.content) as [string, string];
          msg.content = await decryptService.value.decryptMessage({ iv: content[0]!, ciphertext: content[1]! });
        } catch {}
      }

      msg.mediaUrl = await Promise.all((msg.mediaUrl || []).map(async url => {
        try {
          const content = JSON.parse(url) as [string, string];
          return await decryptService.value.decryptMessage({ iv: content[0]!, ciphertext: content[1]! });
        } catch {
          return url;
        }
      }));
    }

    if (firstExecution.value) {
      firstExecution.value = false;
      nextTick(() => {
        (bottomMessageBlockElement.value as HTMLDivElement)?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      });
      nextTick(() => emits('messagesLoaded', props.messageBlock.blockNumber));
    } else {
      nextTick(() => emits('messagesChanged', props.messageBlock.blockNumber));
    }
    messages.value = msgs;

    loading.value = false;
  }
};

watch(() => props.messageBlock.updatedAt, loadMessages, { immediate: true });
watch(() => props.enabledLoading, async (pre, pos) => {
    await loadMessages();
}, { immediate: true });

</script>
<style lang="scss" scoped>

</style>
