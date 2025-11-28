<template lang="pug">
q-page-sticky.z-top(position="top-right" :offset="[10, 10]" v-if="canInvite && youJoined")
  q-fab(icon="mdi-plus" direction="left" push glossy color="light-ocean" padding="sm")
    q-fab-action(icon="mdi-account-plus-outline" label="Convidar usuário" color="light-ocean" push @click="invite()")

.q-pa-md.row.justify-center.full-width(
  v-if="!youJoined"
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
            q-img(:src="room.imageUrl || '/logo.png'" :ratio="1" fit="cover")
        q-card-section.text-body1
          div Você ainda não está participando do grupo #[span.text-weight-bold {{ room.name }}]

        q-async-btn(
          label="Entrar" color="medium-sea" push glossy
          :handler="joinRoom"
        )

        q-card.rounded.bg-grey-2.q-mt-md(flat bordered v-if="canSendMessage")
          q-card-section.text-italic.text-caption
            | ...ou envie uma mensagem para começar a participar da conversa


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
            q-img(:src="room.imageUrl || '/logo.png'" :ratio="1" fit="cover")
          div(style="position: absolute; top: 25px; right: -40px")
            q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")

        q-card-section.text-body1
          span.text-weight-bold {{ room.name }}

        q-card.rounded.bg-grey-2(flat bordered)
          q-card-section.text-italic.text-caption Ninguém enviou mensagens até o momento.

.row.justify-end(
  v-else
  style="margin-top: auto"
)
  .text-center.full-width.q-py-md
    q-chip(color="deep-sea" dark) início do grupo de mensagens

    MessageItem.full-width(
      v-for="(message, msgIndex) in messages" :key="message.id"
      :message="message"
      :sent="message.sender === address"
      :user="users[message.sender]"
      :isFirst="message.sender !== messages[msgIndex - 1]?.sender"
      :isLast="message.sender !== messages[msgIndex + 1]?.sender"
      :decryptMessage="decryptMessage"
      :roomType="room.roomType"
    )

div(ref="bottomChatElement")

</template>

<script lang="ts" setup>
import { computed, watch, ref, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { EPermission, ERoomType } from '../../../move';
import { PrivateGroupService, PublicChannelService } from '../../../utils/encrypt';
import { shortenAddress } from '../../../utils/formatters';
import { useUserStore, useChatStore, useUiStore } from '../../../stores';
import { db, useLiveQuery } from '../../../utils/dexie';
import { type Message, type UserProfile, type MemberInfo, EMessageType } from '../../../move';
import MessageItem from './MessageItem.vue';

const chatStore = useChatStore();
const userStore = useUserStore();
const uiStore = useUiStore();

const { activeChat: room, canInvite, canSendMessage } = storeToRefs(chatStore);
const { bottomChatElement } = storeToRefs(uiStore);

const profile = computed(() => userStore.profile);
const address = computed(() => profile.value?.owner!);

const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(room.value?.id!) >= 0);
const memberInfo = useLiveQuery(() => db.memberInfo.get(room.value?.id!));

const messages = useLiveQuery(() => db.message.where('roomId').equals(room.value!.id).filter(m => m.eventType === EMessageType.New).sortBy('messageNumber'));
const users = useLiveQuery(async () => {
  const users = await db.profile.bulkGet(Object.keys(room.value?.members || {}));
  return _.keyBy(users, (user: UserProfile) => user.owner);
}, [ room ]);

watch(messages, async (msgs) => {
  if (msgs?.length) {
    await uiStore.scrollTo('bottom', 'instant');
  }
}, { once: true });

const decryptService = computed(() => {
  if (room.value?.roomType === ERoomType.PrivateGroup) {
    const privKey = profile.value?.keyPrivDecoded!;
    const roomKey = memberInfo.value?.roomKey!;
    return new PrivateGroupService({ encodedAesKey: roomKey.encodedPrivKey, iv: roomKey.iv, inviterPublicKey: roomKey.pubKey }, privKey);
  } else if (room.value?.roomType == ERoomType.PublicGroup) {
    return new PublicChannelService(room.value.owner);
  }
});

const decryptMessage = async (message: Message) => {
  let content = message.content;
  let mediaUrl = message.mediaUrl;

  try {
    const obj = JSON.parse(content) as [ iv: string, ciphertext: string ];
    content = await decryptService.value!.decryptMessage({ iv: obj[0], ciphertext: obj[1] });
  } catch {}
  mediaUrl = await Promise.all((mediaUrl || []).map(async url => {
    try {
      const content = JSON.parse(url) as [iv: string, ciphertext: string];
      return await decryptService.value!.decryptMessage({ iv: content[0], ciphertext: content[1] });
    } catch {
      return url;
    }
  }));
  return { content, mediaUrl };
};

const joinRoom = async() => {
  await chatStore.joinRoom(room.value!);
};

const invite = async () => {
  const users = await db.profile.where('owner').noneOf(Object.keys(room.value?.members || {})).toArray();

  Dialog.create({
    title: 'Adicionar quem?',
    options: {
      model: '',
      items: users.map(user => ({ label: `${user.username} (${shortenAddress(user.owner)})`, value: user }))
    },
    ok: {
      color: 'primary',
      label: 'Convidar usuário'
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
      color: 'grey'
    }
  }).onOk(async (user: UserProfile) => {

    const notif = Notify.create({
      group: false,
      timeout: 0,
      spinner: true,
      message: `Criando convite para ${user.username}`,
      caption: 'Aguardando aprovação da transação...',
      color: 'primary'
    });

    try {
      const privKey = userStore.profile?.keyPrivDecoded!;
      let roomKey: Parameters<typeof chatStore.inviteMember>[0]['roomKey'];

      if (room.value?.roomType === ERoomType.PrivateGroup) {
        const userRoomKey = memberInfo.value?.roomKey!;
        const svc = new PrivateGroupService({ encodedAesKey: userRoomKey.encodedPrivKey, iv: userRoomKey.iv, inviterPublicKey: userRoomKey.pubKey }, privKey);
        const inviteKey = await PrivateGroupService.generateInvitationKey(
          (await svc.exportRoomAesKey())!,
          privKey,
          userStore.profile?.keyPub!,
          user?.keyPub!
        );
        roomKey = {
          encodedPrivKey: inviteKey.encodedAesKey,
          iv: inviteKey.iv,
          pubKey: inviteKey.inviterPublicKey
        };
      } else if (room.value?.roomType === ERoomType.PublicGroup) {
        // no room key needed
      }

      const res = await chatStore.inviteMember({
        room: room.value!,
        inviteeAddress: user.owner,
        roomKey
      });
      await db.refreshUserRooms([ room.value?.id! ]);

      notif({
        message: `${user.username} convidado/a com sucesso!`,
        caption: '',
        spinner: false,
        timeout: 2500,
        icon: 'done',
        color: 'positive'
      });
    } catch (exc) {
      notif({
        message: 'Não foi possível adicionar o convidado!',
        caption: '',
        spinner: false,
        timeout: 2500,
        color: 'negative'
      });
      console.error(exc);
    }
  });
};

</script>
<style lang="scss" scoped>
</style>
