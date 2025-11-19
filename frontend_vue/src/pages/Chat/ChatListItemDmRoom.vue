<template lang="pug">
q-item-section(avatar)
  q-avatar
    q-img(:src="contactedUser?.avatarUrl || '/user-circles-set.png'" :ratio="1" fit="cover")

template(v-if="!contactedUser")
  q-item-section
    q-item-label(lines="1")
      span.text-italic.text-caption perfil excluído

template(v-else)
  q-item-section
    q-item-label(lines="1")
      .flex.items-center
        div {{ contactedUser?.username }}

        div(caption lines="1" v-if="!youJoined || !contactedUserJoined")
          q-icon.q-mb-xs.q-ml-xs(name="mdi-alert-circle" color="sea" size="16px" v-if="!youJoined")
            q-tooltip Você ainda não aceitou o convite
          q-icon.q-mb-xs.q-ml-xs(name="mdi-alert-circle" color="sea" size="16px" v-if="!contactedUserJoined" )
            q-tooltip O usuário ainda não aceitou o seu convite

    q-item-label.text-italic(
      v-if="lastMessage" caption lines="2"
    )
      | {{ users[lastMessage.sender]?.username }}:
      | {{ lastMessage.deletedAt ? 'mensagem removida' : lastMessage.content }}
      template(v-if="lastMessage.mediaUrl?.length")
        span.q-mr-xs imagem
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
import { type UserProfile, type ChatRoom, type Message } from '../../move';
import { useChat } from './useChat';
import { useProfile } from './useProfile';
import { DirectMessageService } from 'src/utils/encrypt';
import { useUsersStore } from '../../stores';
import { storeToRefs } from 'pinia';
import { formatDate, formatTime } from '../../utils/formatters';
import { useMessageFeeder } from './useMessageFeeder';

const props = defineProps({
  userAddress: {
    type: String,
    required: true
  },
  users: {
    type: Object as PropType<Record<string, UserProfile>>,
    required: true
  },
  room: {
    type: Object as PropType<ChatRoom>,
    required: true
  }
})

const { users } = storeToRefs(useUsersStore());
const { userStore } = useProfile();
const { getDmParticipantId } = useChat();
const { latestMessages  } = useMessageFeeder();
const contactedParticipantId = computed(() => getDmParticipantId(props.room));
const contactedUser = computed(() => props.users[contactedParticipantId.value!]);

const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(props.room.id) >= 0);
const contactedUserJoined = computed(() => (contactedUser.value?.roomsJoined || []).indexOf(props.room.id) >= 0);
const isToday = (timestamp: number) => moment(Number(timestamp)).isSame(moment(), 'date');
const dmService = computed(() => new DirectMessageService(userStore.profile?.keyPrivDecoded!, contactedUser.value?.keyPub!));
const lastMessage = ref<Message>();

watch(() => latestMessages.value[props.room.id], async (message) => {
  if (message) {
    if (!message.deletedAt) {
      try {
        const jsonMessage = JSON.parse(message?.content!) as string[];
        message!.content = await dmService.value.decryptMessage({ iv: jsonMessage[0]!, ciphertext: jsonMessage[1]! });
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
