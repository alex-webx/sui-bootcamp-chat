<template lang="pug">
q-chat-message(
  :sent="true"
  bg-color="primary" text-color="white"
)

  template(#name)
    span.text-weight-bold.text-ocean
      | {{ user.username }}

  template(#avatar)
    q-avatar.q-ml-sm
      q-img(:src="user.avatarUrl || './logo_sui_chat_bordered.png'" :ratio="1" fit="cover")

  template(#stamp)
    .flex.items-center.text-caption
      q-icon.q-mr-xs(name="mdi-lock")
        q-tooltip Mensagem criptografada E2EE utilizando uma chave AES derivada de ECDH das duas partes
      span.text-italic
        | {{ fromNow(message.createdAt) }}
      q-space
      q-btn.q-ml-md(icon="mdi-pound" dense size="xs" flat @click="exploreTxs([message])")
        q-tooltip Verificar transação no Suiscan


  template(v-if="message.deletedAt")
    .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders.deleted-message
      | mensagem removida

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
              q-btn.bg-sea(icon="mdi-pencil-outline" size="md" outline @click="editMessage()")


</template>
<script setup lang="ts">
import { ref, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { Dialog, openURL, Screen } from 'quasar';
import { useChat } from '../useChat';
import { shortenAddress } from '../../../utils/formatters';
import { type MessageBlock, type Message, type UserProfile, chatRoomModule } from '../../../move';
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
  dmUser: {
    type: Object as PropType<UserProfile>,
    required: true
  }
});

const { message, user, dmUser } = toRefs(props);
const chatService = useChat();
const isSelected = ref(false);

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

const deleteMessage = async () => {
  try {
    await chatService.deleteMessage(message.value);
  } finally {
    isSelected.value = false;
  }
};

const editMessage = async () => {

};


</script>
<style lang="scss" scoped>
.deleted-message {
  background: rgba(255,255,255, 0.2);
}
</style>
