<template lang="pug">

.q-px-md(v-for="message in messages" :key="message.id")

  MessageUser(
    v-if="message.sender === user.owner"
    :user="props.user" :dmUser="props.dmUser"
    :message="message"
  )
  MessageDmUser(
    v-else
    :user="props.user" :dmUser="props.dmUser"
    :message="message"
  )

</template>
<script setup lang="ts">
import { nextTick, ref, onMounted, computed, toRefs, onBeforeUnmount, type PropType, watch } from 'vue';
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
  }
});

const emits = defineEmits<{
  (e: 'messagesLoaded'): void,
  (e: 'messagesChanged'): void
}>();

const firstExeceution = ref(true);
const messages = ref<Message[]>([]);
const decryptService = computed(() => {
  const privKey = props.user?.keyPrivDecoded!;
  const dmUserPubKey =  props.dmUser.keyPub;
  const dmService = new DirectMessageService(privKey, dmUserPubKey);
  return dmService;
});

watch(() => props.messageBlock.updatedAt, async () => {
  const msgs = await chatRoomModule.getChatRoomMessagesFromBlock(props.messageBlock);
  console.log('changed!');

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

  if (firstExeceution.value) {
    firstExeceution.value = false;
    nextTick(() => emits('messagesLoaded'));
  } else {
    nextTick(() => emits('messagesChanged'));
  }
  messages.value = msgs;
  // console.log('msgs changed', ">" + msgs.slice(-1)[0]?.content + "<");
}, { immediate: true });

</script>
<style lang="scss" scoped>

</style>
