<template lang="pug">
q-chat-message(
  :sent="sent"
  :bg-color="bgColor"
  :text-color="textColor"
  :class="{ 'is-first': isFirst, 'is-last': isLast }"
  :id="'message_' + message.messageNumber"
)
  template(#name v-if="isFirst")
    span.text-weight-bold(:class="sent ? 'text-ocean' : 'text-medium-sea'")
      | {{ user.username }}

  template(#avatar)
    q-avatar.q-mx-md
      q-img(v-if="isLast" :src="user.avatarUrl || './logo.png'" :ratio="1" fit="cover")

  template(#stamp)
    .flex.items-center
      q-icon(name="mdi-lock" v-if="roomType === 1")
        q-tooltip
          div Mensagem criptografada utilizando
          div chave AES compartilhada por ECDH
      q-icon(name="mdi-lock-open-outline" v-else-if="roomType === 2")
        q-tooltip
          div Mensagem criptografada utilizando
          div chave AES compartilhada publicamente
      span
        q-badge(:color="bgColor" :text-color="textColor") {{ stamp(message.createdAt) }}
          q-tooltip {{ formatFullDate(message.createdAt) }}
      q-space
      q-badge(v-if="message.editedAt" label="editada" dense flat no-caps :color="bgColor" :text-color="textColor")
        q-tooltip Editada em {{ formatFullDate(message.editedAt) }}
      q-btn(icon="mdi-pound" dense size="xs" flat @click="exploreObject()")
        q-tooltip Verificar mensagem no Suiscan

  template(v-if="message.deletedAt")
    .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders.deleted-message
      | mensagem removida
      q-tooltip Removida em {{ formatFullDate(message.deletedAd) }}

  template(v-else)
    .text-body1(
      v-touch-hold.mouse="() => sent ? isSelected = true : undefined"
      @contextmenu.prevent="() => sent ? isSelected = true : undefined"
      @dblclick="() => sent ? isSelected = true : undefined"
    )
      video.fit(
        v-if="mediaUrl.length"
        :key="mediaUrl[0]"
        autoplay loop muted playisline
        style="max-width: 250px"
      )
        source(:src="mediaUrl[0]")

      .q-px-sm(v-for="(line, iLine) in content.split('\\n')" :key="'line_' + iLine" :class="sent ? 'text-right' : 'text-left'")
        | {{ line }}

      transition-group(
        appear
        enter-active-class="animated flipInX"
        leave-active-class="animated flipOutX"
      )
        div(v-if="isSelected")
          q-separator(dark spaced key="separator")
          .flex.flex-center(key="buttons")
            q-btn-group.bg-white(outline)
              q-btn.bg-sea(icon="close" @click="isSelected = false" size="md" outline)
              q-separator(vertical)
              q-btn.bg-sea(icon="mdi-trash-can-outline" size="md" outline @click="deleteMessage()")
              q-separator(vertical)
              q-btn.bg-sea(icon="mdi-pencil-outline" size="md" outline @click="startEditMessage()")


</template>
<script setup lang="ts">
import { computed, watchEffect, ref, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { openURL } from 'quasar';
import { useChat } from '../useChat';
import { stamp, formatFullDate } from '../../../utils/formatters';
import { type Message, type UserProfile, ERoomType, getNetwork } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';

const props = defineProps({
  message: {
    type: Object as PropType<Message>,
    required: true
  },
  sent: {
    type: Boolean,
    requireD: true
  },
  user: {
    type: Object as PropType<UserProfile>,
    required: true
  },
  isFirst: {
    type: Boolean
  },
  isLast: {
    type: Boolean
  },
  decryptMessage: {
    type: Function,
    required: true
  },
  roomType: {
    type: Number as PropType<ERoomType>,
    required: true
  }
});

const { message, user, sent, isFirst, isLast, roomType } = toRefs(props);
const chatService = useChat();
const isSelected = ref(false);
const bgColor = computed(() => sent.value ? 'primary' : 'white');
const textColor = computed(() => sent.value ? 'white' : 'dark');

const content = ref('');
const mediaUrl = ref<string[]>([]);

const overwrites = useLiveQuery(() => message.value.editedAt ? db.message.where('previousVersionId').equals(message.value.id).sortBy('createdAt').then(ms => ms.slice(-1)?.[0]) : null, [ message ]);

watchEffect(async () => {
  const decrypted = await props.decryptMessage(overwrites.value || message.value);
  content.value = decrypted.content;
  mediaUrl.value = decrypted.mediaUrl;
});

const exploreObject = () => {
  openURL(`https://suiscan.xyz/${getNetwork()}/object/${message.value.id}/fields`);
};

const deleteMessage = async () => {
  try {
    await chatService.deleteMessage(message.value);
  } finally {
    isSelected.value = false;
  }
};

const startEditMessage = async () => {
  isSelected.value = false;
  chatService.newMessage.value = {
    id: message.value.id,
    content: content.value || '',
    mediaUrl: mediaUrl.value || [],
    replyTo: message.value.replyTo || ''
  };
};


</script>
<style lang="scss" scoped>
:deep(.q-message-text--sent .deleted-message) {
  background: rgba(255,255,255, 0.2);
}

:deep(.q-message-text:last-child:before) {
  border: none;
}

.is-last :deep(.q-message-text--sent:last-child:before) {
  border-left: 0 solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid currentColor;
}

:deep(.q-message-text--received .deleted-message) {
  background: rgba(0,0,0, 0.05);
}

:deep(.q-message-text:last-child:before) {
  border: none;
}

.is-last :deep(.q-message-text--received:last-child:before) {
  border-right: 0 solid transparent;
  border-left: 8px solid transparent;
  border-bottom: 8px solid currentColor;
}
</style>
