<template lang="pug">
q-chat-message(
  :sent="false"
  bg-color="white" text-color="dark"
  :class="{ 'is-first': isFirst, 'is-last': isLast }"
)

  template(#name v-if="isFirst")
    span.text-weight-bold.text-medium-sea
      | {{ otherUser.username }}

  template(#avatar)
    q-avatar.q-mr-sm
      q-img(v-if="isLast" :src="otherUser.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")

  template(#stamp)
   .flex.items-center
      q-icon(name="mdi-lock")
        q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
      span
        q-badge(color="white" text-color="dark") {{ fromNow(message.createdAt) }}
          q-tooltip {{ formatFullDate(message.createdAt) }}
      q-space
      q-badge(v-if="message.editedAt" label="editada" dense flat no-caps color="white" text-color="dark")
        q-tooltip Editada em {{ formatFullDate(message.editedAt) }}

      q-btn(icon="mdi-pound" dense size="xs" flat @click="exploreObject([message])")
        q-tooltip Verificar objeto no Suiscan

  template(v-if="message.deletedAt")
    .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders.deleted-message
      | mensagem removida
      q-tooltip Removida em {{ formatFullDate(message.deletedAt) }}

  template(v-else)
    .text-body1(
    )
      video.fit(
        v-if="message.mediaUrl?.length"
        autoplay loop muted playisline
        style="max-width: 250px"
      )
        source(:src="message.mediaUrl[0]")

      div(v-for="(line, iLine) in message.content.split('\\n')" :key="'line_' + iLine")
        | {{ line }}

</template>
<script setup lang="ts">
import { toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { Dialog, openURL } from 'quasar';
import { shortenAddress, formatFullDate } from '../../../utils/formatters';
import { type Message, type UserProfile, getNetwork } from '../../../move';
import moment from 'moment';

const props = defineProps({
  message: {
    type: Object as PropType<Message>,
    required: true
  },
  otherUser: {
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

const { message, otherUser, isFirst, isLast } = toRefs(props);

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

</script>
<style lang="scss" scoped>
.deleted-message {
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
