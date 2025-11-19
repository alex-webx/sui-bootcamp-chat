<template lang="pug">
q-chat-message(
  :sent="false"
  bg-color="white" text-color="dark"
)

  template(#name)
    span.text-weight-bold.text-medium-sea
      | {{ dmUser.username }}

  template(#avatar)
    q-avatar.q-mr-sm
      q-img(:src="dmUser.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")

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
import { ref, onMounted, computed, toRefs, onBeforeUnmount, type PropType, watch } from 'vue';
import _ from 'lodash';
import { Dialog, openURL, Screen } from 'quasar';
import { storeToRefs } from 'pinia';
import { useChatRoomStore, useUserStore, useUsersStore } from '../../../stores';
import { useChat } from '../useChat';
import { useAsyncLoop } from '../../../utils/delay';
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

</script>
<style lang="scss" scoped>
.deleted-message {
  background: rgba(0,0,0, 0.05);
}
</style>
