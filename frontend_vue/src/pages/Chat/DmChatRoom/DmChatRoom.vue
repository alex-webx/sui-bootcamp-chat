<template lang="pug">
.q-pa-md.row.justify-center.full-width(
  v-if="dmUser && !dmUserJoined"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated zoomIn slower"
    leave-active-class="animated zoomInDown slower"
  )
    q-card.rounded.text-center(style="max-width: 360px")
      .flex.flex-center.column.q-ma-lg
        .relative-position
          q-avatar.q-mt-xl(size="100px")
            q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
          div(style="position: absolute; top: 25px; right: -40px")
            q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
        q-card-section.text-body1
          | #[span.text-weight-bold {{ dmUser?.username }}] ainda não aceitou o seu convite

.q-pa-md.row.justify-center.full-width(
  v-else-if="dmUser && !youJoined"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated zoomIn slower"
    leave-active-class="animated zoomInDown slower"
  )
    q-card.rounded.text-center(style="max-width: 360px")
      .flex.flex-center.column.q-ma-lg
        .relative-position
          q-avatar.q-mt-xl(size="100px")
            q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
        q-card-section.text-body1
          div Você ainda não aceitou o convite de #[span.text-weight-bold {{ dmUser?.username }}]

        q-async-btn(
          label="Entrar" color="medium-sea" push glossy
          :handler="joinRoom"
        )

        q-card.rounded.bg-grey-2.q-mt-md(flat bordered)
          q-card-section.text-italic.text-caption
            | ...ou envie uma mensagem para começar a conversar com {{ dmUser?.username }}


.q-pa-md.row.justify-center.full-width(
  v-else-if="room.messageCount === 0"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated zoomIn slower"
    leave-active-class="animated zoomInDown slower"
  )
    q-card.rounded.text-center(style="max-width: 360px")
      .flex.flex-center.column.q-ma-lg
        .relative-position
          q-avatar.q-mt-xl(size="100px")
            q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
          div(style="position: absolute; top: 25px; right: -40px")
            q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
        q-card-section.text-body1
          | #[span.text-weight-bold Você e {{ dmUser?.username }}] ainda não trocaram mensagens


.row.justify-end(
  v-if="youJoined && dmUser"
  style="margin-top: auto"
)
  .text-center.full-width.q-py-md
    q-chip(color="deep-sea" dark) início da conversa com {{ dmUser.username }}

    MessageItem.full-width(
      v-for="(message, msgIndex) in messages" :key="message.id"
      :message="message"
      :sent="message.sender === address"
      :user="message.sender === address ? profile : dmUser"
      :isFirst="message.sender !== messages[msgIndex - 1]?.sender"
      :isLast="message.sender !== messages[msgIndex + 1]?.sender"
      :decryptMessage="decryptMessage"
    )

div(ref="bottomChatElement")

</template>

<script lang="ts" setup>
import { computed, watch  } from 'vue';
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import { useUserStore, useChatStore, useUiStore } from '../../../stores';
import { db, useLiveQuery } from '../../../utils/dexie';
import { DirectMessageService } from '../../../utils/encrypt';
import { type Message, EMessageType } from '../../../move';
import * as walrus from '../../../utils/walrus';
import MessageItem from './MessageItem.vue';

const userStore = useUserStore();
const chatStore = useChatStore();
const uiStore = useUiStore();
const { activeChat: room } = storeToRefs(chatStore);
const { bottomChatElement } = storeToRefs(uiStore);

const profile = computed(() => userStore.profile);
const address = computed(() => profile.value?.owner!);
const dmUserAddress = computed(() => _.findKey(room.value?.members, (v, k) => k !== address.value));
const dmUser = useLiveQuery(() => db.profile.get(dmUserAddress.value!), [ dmUserAddress ]);
const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(room.value!.id) >= 0);
const dmUserJoined = computed(() => (dmUser.value?.roomsJoined || []).indexOf(room.value!.id) >= 0);

const messages = useLiveQuery(() => db.message.where('roomId').equals(room.value!.id).filter(m => m.eventType === EMessageType.New).sortBy('messageNumber'));

const joinRoom = async() => {
  await chatStore.joinRoom(room.value!);
};

watch(messages, async (msgs) => {
  if (msgs?.length) {
    await uiStore.scrollTo('bottom', 'instant');
  }
}, { once: true });

const decryptService = computed(() => new DirectMessageService(userStore.profile?.keyPrivDecoded!, dmUser.value?.keyPub!));
const decryptMessage = async (message: Message) => {
  let content = message.content;
  let mediaUrl = message.mediaUrl;

  try {
    const obj = JSON.parse(content) as [ iv: string, ciphertext: string ];
    content = await decryptService.value.decryptMessage({ iv: obj[0], ciphertext: obj[1] });
  } catch {}

  mediaUrl = await Promise.all((mediaUrl || []).map(async encUrl => {
    try {
      const content = JSON.parse(encUrl) as [iv: string, ciphertext: string];
      let url = await decryptService.value.decryptMessage({ iv: content[0], ciphertext: content[1] });

      if (url.startsWith('walrus://')) {
        url = url.replace('walrus://', '');
        const encryptedContent = await fetch(url).then(res => res.arrayBuffer());
        const encryptedContentData = JSON.parse(new TextDecoder().decode(encryptedContent)) as { iv: string, ciphertext: string };
        const decrypted = await decryptService.value!.decryptMessage(encryptedContentData);
        url = URL.createObjectURL(await walrus.base64ToBlob(decrypted));
      }

      return url;
    } catch {
      return encUrl;
    }
  }));
  return { content, mediaUrl };
};

</script>
<style lang="scss" scoped>
</style>
