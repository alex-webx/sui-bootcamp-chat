<template lang="pug">
q-chat-message(
  :sent="true"
  bg-color="primary" text-color="white"
  :class="{ 'is-first': isFirst, 'is-last': isLast }"
)

  template(#name v-if="isFirst")
    span.text-weight-bold.text-ocean
      | {{ user.username }}

  template(#avatar)
    q-avatar.q-ml-sm
      q-img(v-if="isLast" :src="user.avatarUrl || './logo.png'" :ratio="1" fit="cover")

  template(#stamp)
    .flex.items-center
      q-icon(name="mdi-lock")
        q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
      span
        q-badge {{ fromNow(message.createdAt) }}
          q-tooltip {{ formatFullDate(message.createdAt) }}
      q-space
      q-badge(v-if="message.editedAt" label="editada" dense flat no-caps)
        q-tooltip Editada em {{ formatFullDate(message.editedAt) }}
      q-btn(icon="mdi-pound" dense size="xs" flat @click="exploreObject([message])")
        q-tooltip Verificar objeto no Suiscan


  template(v-if="message.deletedAt")
    .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders.deleted-message
      | mensagem removida
      q-tooltip Removida em {{ formatFullDate(message.deletedAd) }}

  template(v-else)
    .text-body1(
      v-touch-hold.mouse="() => isSelected = true"
      @contextmenu.prevent="() => isSelected = true"
      @dblclick="() => isSelected = true"
    )
      video.fit(
        v-if="message.mediaUrl?.length"
        autoplay loop muted playisline
        style="max-width: 250px"
      )
        source(:src="message.mediaUrl[0]")

      div(v-for="(line, iLine) in message.content.split('\\n')" :key="'line_' + iLine")
        | {{ line }}

      template(v-if="isSelected")
        transition-group(
          appear
          enter-active-class="animated flipInX slower"
          leave-active-class="animated flipInX slower"
        )
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
import { ref, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { Dialog, openURL } from 'quasar';
import { useChat } from '../useChat';
import { shortenAddress, formatFullDate } from '../../../utils/formatters';
import { type Message, type UserProfile, getNetwork } from '../../../move';
import moment from 'moment';

const props = defineProps({
  message: {
    type: Object as PropType<Message>,
    required: true
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
  }
});

const { message, user, isFirst, isLast } = toRefs(props);
const chatService = useChat();
const isSelected = ref(false);

const fromNow = (timestamp: number) => moment(Number(timestamp)).locale('pt-br').fromNow();

const exploreObject = async (messages: Message[]) => {
  let objId = '';

  if (messages.length === 1) {
    objId = messages[0]?.id!;
  } else {
    objId = await new Promise(resolve => Dialog.create({
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

  if (objId) {
    openURL(`https://suiscan.xyz/${getNetwork()}/object/${objId}/fields`);
  }
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
    content: message.value.content || '',
    mediaUrl: message.value.mediaUrl || [],
    replyTo: message.value.replyTo || ''
  };
};

</script>
<style lang="scss" scoped>
.deleted-message {
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
</style>
