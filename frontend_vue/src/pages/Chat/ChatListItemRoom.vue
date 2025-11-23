<template lang="pug">
q-item-section(avatar)
  q-avatar(size="48px")
    q-img(:src="room.imageUrl || '/user-circles-set.png'" :ratio="1" fit="cover")

q-item-section
  q-item-label(lines="1")
    .flex.items-center
      div {{ room.name }}

      div(caption lines="1" v-if="!youJoined")
        q-icon.q-mb-xs.q-ml-xs(name="mdi-alert-circle" color="sea" size="16px" v-if="!youJoined")
          q-tooltip Você ainda não entrou na sala

  q-item-label.text-italic(
    v-if="lastMessage" caption lines="2"
  )
    | {{ usersCache[lastMessage.sender]?.username }}:
    | {{ lastMessage.deletedAt ? 'mensagem removida' : lastMessage.content }}
    template(v-if="lastMessage.mediaUrl?.length")
      span.q-mx-xs imagem
      q-icon( name="mdi-image-outline")


q-item-section(side)
  q-item-label(caption v-if="lastMessage && !isToday(lastMessage.createdAt)")
    div {{ formatDate(lastMessage.createdAt) }}
  q-item-label(caption v-if="lastMessage")
    div {{ formatTime(lastMessage.createdAt) }}


</template>
<script setup lang="ts">
import { watch, onMounted, ref, computed, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import moment from 'moment';
import { type ChatRoom, type Message, ERoomType } from '../../move';
import { useProfile } from './useProfile';
import { PrivateGroupService, PublicChannelService } from '../../utils/encrypt';
import { useChatListStore  } from '../../stores';
import { storeToRefs } from 'pinia';
import { formatDate, formatTime } from '../../utils/formatters';
import { useMessageFeeder } from './useMessageFeeder';

const props = defineProps({
  userAddress: {
    type: String,
    required: true
  },
  room: {
    type: Object as PropType<ChatRoom>,
    required: true
  }
})

const { usersCache } = storeToRefs(useChatListStore());
const { userStore } = useProfile();
const { latestMessages  } = useMessageFeeder();

const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(props.room.id) >= 0);
const isToday = (timestamp: number) => moment(Number(timestamp)).isSame(moment(), 'date');
const member = computed(() => userStore.memberInfos[props.room.id]);

const decryptService = computed(() => {
  if (props.room.roomType === ERoomType.PrivateGroup) {
    const svc = new PrivateGroupService({
      encodedAesKey: member.value?.roomKey?.encodedPrivKey!,
      iv: member.value?.roomKey?.iv!,
      inviterPublicKey: member.value?.roomKey?.pubKey!
    }, userStore.profile?.keyPrivDecoded!);
    return svc;
  } else if (props.room.roomType == ERoomType.PublicGroup) {
    const svc = new PublicChannelService(props.room.owner);
    return svc;
  }
});

const lastMessage = ref<Message>();

watch(() => latestMessages.value[props.room.id], async (message) => {
  if (message) {
    if (!message.deletedAt) {
      try {
        const jsonMessage = JSON.parse(message?.content!) as string[];
        message!.content = await decryptService.value?.decryptMessage({ iv: jsonMessage[0]!, ciphertext: jsonMessage[1]! })!;
      } catch { }
    }
  }
  lastMessage.value = message;
}, { immediate: true, deep: true });

</script>
<style lang="scss" scoped>
.q-item__label {
  max-width: 200px;
}
</style>
