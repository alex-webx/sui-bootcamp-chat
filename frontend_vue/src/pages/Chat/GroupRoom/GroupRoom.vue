<template lang="pug">
.q-pa-md.row.justify-center.full-width(
  v-if="loading"
  style="margin-top: auto; margin-bottom: auto"
)
  transition(
    appear
    enter-active-class="animated tada slower"
    leave-active-class="animated tada slower"
  )
    .flex.flex-center.column
      img(src="/logo.png" style="width: 200px; opacity: 1;")

template(v-else)
  //- .q-pa-md.row.justify-center.full-width(
  //-   v-if="dmUser && !dmUserJoined"
  //-   style="margin-top: auto; margin-bottom: auto"
  //- )
  //-   transition(
  //-     appear
  //-     enter-active-class="animated zoomIn slower"
  //-     leave-active-class="animated zoomInDown slower"
  //-   )
  //-     q-card.rounded.text-center(style="max-width: 360px")
  //-       .flex.flex-center.column.q-ma-lg
  //-         .relative-position
  //-           q-avatar.q-mt-xl(size="100px")
  //-             q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
  //-           div(style="position: absolute; top: 25px; right: -40px")
  //-             q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
  //-         q-card-section.text-body1
  //-           | #[span.text-weight-bold {{ dmUser?.username }}] ainda não aceitou o seu convite

  //- .q-pa-md.row.justify-center.full-width(
  //-   v-else-if="dmUser && !youJoined"
  //-   style="margin-top: auto; margin-bottom: auto"
  //- )
  //-   transition(
  //-     appear
  //-     enter-active-class="animated zoomIn slower"
  //-     leave-active-class="animated zoomInDown slower"
  //-   )
  //-     q-card.rounded.text-center(style="max-width: 360px")
  //-       .flex.flex-center.column.q-ma-lg
  //-         .relative-position
  //-           q-avatar.q-mt-xl(size="100px")
  //-             q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
  //-         q-card-section.text-body1
  //-           div Você ainda não aceitou o convite de #[span.text-weight-bold {{ dmUser?.username }}]


  //-         q-card.rounded.bg-grey-2(flat bordered)
  //-           q-card-section.text-italic.text-caption Envie uma mensagem para iniciar a conversa!


  //- .q-pa-md.row.justify-center.full-width(
  //-   v-else-if="activeChatRoom.messageCount === 0"
  //-   style="margin-top: auto; margin-bottom: auto"
  //- )
  //-   transition(
  //-     appear
  //-     enter-active-class="animated zoomIn slower"
  //-     leave-active-class="animated zoomInDown slower"
  //-   )
  //-     q-card.rounded.text-center(style="max-width: 360px")
  //-       .flex.flex-center.column.q-ma-lg
  //-         .relative-position
  //-           q-avatar.q-mt-xl(size="100px")
  //-             q-img(:src="dmUser?.avatarUrl || '/user-circles-set-sm.png'" :ratio="1" fit="cover")
  //-           div(style="position: absolute; top: 25px; right: -40px")
  //-             q-icon(name="mdi-chat-sleep-outline" size="50px" color="medium-sea")
  //-         q-card-section.text-body1
  //-           | #[span.text-weight-bold Você e {{ dmUser?.username }}] ainda não trocaram mensagens

  q-page-sticky.z-top(position="top-right" :offset="[10, 10]" v-if="canInvite")
    q-fab(icon="mdi-plus" direction="left" push glossy color="light-ocean" padding="sm")
      q-fab-action(icon="mdi-account-plus-outline" label="Adicionar convidado" color="light-ocean" push @click="invite()")

  .row.justify-end(
    style="margin-top: auto"
  )
    .q-px-md.full-width(v-for="(msgBlock, msgBlockIndex) in messageBlocks" :key="msgBlock.id")

      .flex.full-width.flex-center.q-mb-md.block-separator(
        v-if="msgBlockIndex === (messageBlocks.length - messageBlockLoadCount - 1)"
      )
        q-btn.full-width(
          @click="messageBlockLoadCount++" flat stack icon="mdi-chevron-up"
          label="carregar mais mensagens" color="grey-7"
        )

      template(v-if="msgBlockIndex >= (messageBlocks.length - messageBlockLoadCount)")

        .text-center.full-width.q-py-md(
          v-if="msgBlockIndex === 0"
        )
          q-chip(color="deep-sea" dark) início do grupo de mensagens

        MessageBlock(
          :messageBlock="msgBlock"
          :user="profile"
          :users="users"
          :room="activeChatRoom"
          @messagesLoaded="(blockNumber) => messagesEvent('loaded', blockNumber)"
          @messagesChanged="(blockNumber) => messagesEvent('changed', blockNumber)"
          :enabledLoading="msgBlockIndex >= (messageBlocks.length - messageBlockLoadCount)"
        )

  div(ref="bottomChatElement")

</template>

<script lang="ts" setup>
import { computed, watch, ref, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import { storeToRefs } from 'pinia';
import { useChat } from '../useChat';
import { EPermission } from '../../../move';
import { PrivateGroupService } from '../../../utils/encrypt';
import { shortenAddress } from '../../../utils/formatters';
import { useUserStore, useUsersStore } from '../../../stores';
import { useMessageFeeder } from '../useMessageFeeder';
import MessageBlock from './MessageBlock.vue';

const chatService = useChat();
const userStore = useUserStore();
const usersStore = useUsersStore();
const feeder = useMessageFeeder();
const { users } = storeToRefs(usersStore);
const { profile } = storeToRefs(userStore);
const { activeChatRoom, activeChatRoomId } = storeToRefs(chatService.chatRoomStore);
const {
  getDmParticipantId, messageBlocks, messageBlockLoadCount, fetchMessageBlocks, bottomChatElement, scrollTo,
  breakpoint, screenWidth, desktopMode, drawerWidth
} = chatService;

const loading = ref(false);

const dmUser = computed(() => {
  if (activeChatRoom.value) {
    const participantUserId = getDmParticipantId(activeChatRoom.value);
    return users.value[participantUserId!];
  }
});
const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);
const dmUserJoined = computed(() => (dmUser.value?.roomsJoined || []).indexOf(activeChatRoom.value?.id || '') >= 0);

const canInvite = computed(() => {
  if (activeChatRoom.value?.permissionInvite! === EPermission.Nobody) {
    return false;
  }
  if ((activeChatRoom.value?.permissionInvite! & EPermission.Anyone) === EPermission.Anyone) {
    return true;
  }
  if ((activeChatRoom.value?.permissionInvite! & EPermission.Admin) === EPermission.Admin && profile.value?.owner === activeChatRoom.value?.owner) {
    return true;
  }
  if ((activeChatRoom.value?.permissionInvite! & EPermission.Moderators) === EPermission.Moderators && !!activeChatRoom.value?.moderators?.[profile.value?.owner!]) {
    return true;
  }
  if ((activeChatRoom.value?.permissionInvite! & EPermission.Participants) === EPermission.Participants && !!activeChatRoom.value?.participants?.[profile.value?.owner!]) {
    return true;
  }
  return false;
});


const invite = async () => {
  const privKey = userStore.profile?.keyPrivDecoded!;
  const roomKey =  activeChatRoom.value?.participants[userStore.profile?.owner!]?.roomKey!;

  const addresses = Object.keys(users.value);

  Dialog.create({
    title: 'Adicionar quem?',
    options: {
      model: '',
      items: addresses.map(addr => ({ label: `${users.value[addr]?.username} (${shortenAddress(addr)})`  , value: addr }))
    },
    ok: {
      color: 'primary',
      label: 'Adicionar convidado'
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
      color: 'grey'
    }
  }).onOk(async address => {
    const notif = Notify.create({
      group: false,
      timeout: 0,
      spinner: true,
      message: 'Criando convite',
      caption: 'Aguardando aprovação da transação...',
      color: 'primary'
    })

    try {
      const svc = new PrivateGroupService({ encodedAesKey: roomKey.encodedPrivKey, iv: roomKey.iv, inviterPublicKey: roomKey.pubKey }, privKey);
      const aesRoomKey = await svc.exportRoomAesKey();
      const inviteKey = await PrivateGroupService.generateWrappedKeyForRecipient(
        aesRoomKey!,
        privKey,
        userStore.profile?.keyPub!,
        users.value[address]?.keyPub!
      );

      const res = await chatService.chatRoomStore.inviteParticipant({
        room: activeChatRoom.value!,
        inviteeAddress: address,
        roomKey: {
          encodedPrivKey: inviteKey.encodedAesKey,
          iv: inviteKey.iv,
          pubKey: inviteKey.inviterPublicKey
        }
      });

      notif({
        message: 'Convidado adicionado com sucesso!',
        caption: '',
        spinner: false,
        timeout: 2500,
        icon: 'done',
        color: 'positive'
      });
    } catch {
      notif({
        message: 'Não foi possível adicionar o convidado!',
        caption: '',
        spinner: false,
        timeout: 2500,
        color: 'negative'
      });
    }
  });
};

onMounted(async () => {
  loading.value = true;
  await userStore.ensurePrivateKey();
  loading.value = false;
});

const messagesEvent = async (type: 'loaded' | 'changed', blockNumber: number) => {
  if (type === 'loaded' && blockNumber === messageBlocks.value?.slice(-1)[0]?.blockNumber) {
    console.log('messagesEvent scroll to bottom') ;
    scrollTo('bottom');
  }
};

watch(() => feeder.latestMessageBlocks.value[activeChatRoom.value?.id!], async () => {
  const msgBlocks = await fetchMessageBlocks();
}, { immediate: true });

</script>
<style lang="scss" scoped>
.block-separator {
  background: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba($ocean, 0.06) 40%, rgba($ocean, 0.06) 60%,  rgba(0, 0, 0, 0) 100%);
}
</style>
