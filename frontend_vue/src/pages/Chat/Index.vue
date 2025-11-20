<template lang="pug">
.WAL.position-relative.bg-ocean(:style="style" v-if="profile")
  WavesBackground(:top="100" :height="200")
  .absolute-top-right.q-ma-md
    SettingsMenu(:readonly="true" :show-settings="false")
  .absolute-bottom-right
    DeployLabel

  q-layout.WAL__layout.shadow-3(
    view="lHh LpR lFr" container
  )

    //----- HEADER -----------------------------------------------------------------------------------------------------------------

    q-header(elevated dark)
      q-toolbar.bg-deep-sea.text-white
        q-btn.q-mr-sm(
          round flat
          icon="keyboard_arrow_left"
          @click="toggleLeftDrawer"
          v-if="!desktopMode"
        )

        div(v-if="activeChatRoom")
          transition(
            appear
            enter-active-class="animated backInDown slower"
            leave-active-class="animated fadeOut"
          )
            .cursor-pointer(
              @click="toggleRighttDrawer()"
            )
              q-btn(round flat)
                q-avatar
                  q-img(:src="activeChatRoom.imageUrl || users[dmParticipantId]?.avatarUrl || '/logo_sui_chat.png'" :ratio="1" fit="cover")

              span.text-subtitle1.q-pl-sm
                | {{ activeChatRoom.name || users[dmParticipantId]?.username }}

        q-space



    //----- LEFT DRAWER -----------------------------------------------------------------------------------------------------------------

    q-drawer.bg-grey-2(
      v-model="leftDrawerOpen"
      show-if-above
      :breakpoint="breakpoint" dark
      :width="drawerWidth"
    )
      q-toolbar.bg-deep-sea

        q-avatar.cursor-pointer(@click="editProfile()" size="42px")
          q-img(:src="profile.avatarUrl" :ratio="1" fit="cover" error-src="/user-circles-set-sm.png")

        .q-ml-md.cursor-pointer(@click="editProfile()")
          .text-weight-bold
            | {{ profile?.username }}
          .text-caption.text-aqua
            | {{ shortAddress }}

        q-space

        q-chip.text-caption.text-weight-bold(
          color="white" icon="img:sui-logo-pack/symbol-sea/Sui_Symbol_Sea.svg"
          :clickable="getNetwork() === 'devnet'" @click="getSuiFaucet()"
        )
          | {{  suiBalanceFormatted }}
          q-tooltip(v-if="getNetwork() === 'devnet'") Faucet

        q-btn(round flat icon="more_vert")
          q-menu(auto-close :offset="[110, 8]")
            q-list(style="min-width: 150px")
              q-item(clickable @click="createRoom()")
                q-item-section(avatar)
                  q-icon(name="mdi-forum-plus" color="sea")
                q-item-section Criar nova sala
              q-separator
              q-item(clickable @click="editProfile()")
                q-item-section(avatar)
                  q-icon(name="mdi-account-edit" color="sea")
                q-item-section Editar perfil
              q-item
                //- (clickable @click="deleteProfile()")
                q-item-section(avatar)
                  q-icon(name="mdi-account-cancel" color="grey")
                q-item-section Excluir perfil [desabilitado]
              q-separator
              q-item(clickable @click="disconnect()")
                q-item-section
                  q-item-label Desconectar
                q-item-section(avatar)
                  q-icon(name="mdi-exit-to-app" color="sea")

        q-btn.WAL__drawer-close(
          round flat icon="close" @click="toggleLeftDrawer"
        )

      q-scroll-area.bg-grey-2(style="height: calc(100% - 50px)")
        q-tabs(v-model="tab" content-class="bg-medium-sea text-white" no-caps)
          q-tab(name="mensagens" label="Mensagens")
          q-tab(name="users" label="Usuários")

        q-tab-panels(v-model="tab" animated)
          q-tab-panel.q-pa-none(name="mensagens")
            ChatList
          q-tab-panel.q-pa-none(name="users")
            UsersList


    //----- RIGHT DRAWER -----------------------------------------------------------------------------------------------------------------

    q-drawer.bg-grey-3.text-dark(
      v-if="activeChatRoom"
      :modelValue="activeChatRoom && rightDrawerOpen"
      side="right" style="border-left: 2px solid rgba(0, 0, 0, 0.05) !important"
      :breakpoint="breakpoint" dark
      :width="drawerWidth"
    )
      .absolute.q-pa-sm
        q-btn(
          round flat icon="mdi-chevron-right"
          @click="toggleRighttDrawer()"
        )

      .q-ma-none.flex.flex-center.column.q-py-md.q-gutter-y-sm.card-box(v-if="activeChatRoom.roomType === 1")
        div
          q-avatar(size="80px")
            q-img(:src="activeChatRoom.imageUrl")

        .text-center
          .text-subtitle2 {{ activeChatRoom.name }}
          .text-caption {{ activeChatRoom.messageCount }} {{activeChatRoom.messageCount > 1 ? 'mensagens' : 'mensagem' }}

      .q-pt-xl.q-pb-sm(v-else="activeChatRoom.roomType === 2")


      .q-ma-none.flex.column.q-px-md.q-py-md.q-gutter-y-sm.card-box.text-caption(style="line-height: 11px")
        div Criado em: {{ formatFullDate(activeChatRoom.createdAt) }}
        div ID do chat: {{ shortenAddress(activeChatRoom.id) }}
        div Bloco de mensagens atual: {{ activeChatRoom.currentBlockNumber }}

      .q-ma-none.flex.flex-center.column.q-py-sm.q-gutter-y-sm.card-box
        q-list.full-width
          q-item Participantes

          q-item(v-for="(participant, participantUserId) in activeChatRoom.participants" :key="participantUserId")
            q-item-section(avatar)
              q-avatar
                q-img(:src="users[participantUserId]?.avatarUrl" :ratio="1" fit="cover")
            q-item-section
              q-item-label {{ users[participantUserId]?.username }}
              q-item-label(caption) {{ shortenAddress(participantUserId) }}
            q-item-section(side)
              q-item-label(v-if="activeChatRoom.owner === participantUserId")
                q-chip(size="sm" color="grey-3") Administrador


    //----- CONTENT -----------------------------------------------------------------------------------------------------------------

    q-page-container(
      style="display: flex; flex-direction: column; min-height: calc(100vh - 40px)"
      :key="activeChatRoom?.id || 0"
    )
      template(v-if="activeChatRoom")

        div(v-if="activeChatRoom.roomType === 1")
          h1 TODO


        DmChatRoom(
          v-if="activeChatRoom.roomType === 2"
        )

      .q-pa-md.row.justify-center.full-width(
        v-else style="margin-top: auto; margin-bottom: auto"
      )
        transition(
          appear
          enter-active-class="animated jello slower"
          leave-active-class="animated fadeOut"
        )
          img(src="/logo.png" style="width: 200px; opacity: 0.2")


    //----- FOOTER -----------------------------------------------------------------------------------------------------------------

    template(v-if="activeChatRoom")
      transition(
        appear
        enter-active-class="animated fadeInUp slower"
        leave-active-class="animated fadeOut slower"
      )
        q-footer(:class="newMessage.id ? 'footer-edit-mode' : 'bg-deep-sea'")
          q-form(@submit="sendMessage()" ref="form")

            q-toolbar.text-white.row(v-if="newMessage.id")
              .full-width.q-pl-sm.text-body1 Editar mensagem
              q-btn(icon="close" flat dense @click="clearNewMessage()")

            q-toolbar.justify-center.text-white.q-pt-md(v-if="newMessage.mediaUrl?.length")
              .text-white(style="max-width: 30%")
                .flex.row
                  .col
                    video.fit(autoplay loop muted playisline style="max-height: 50vh")
                      source(:src="newMessage.mediaUrl[0]")
                  .col-auto
                    q-btn(icon="close" flat dense round @click="removeGif()")

            q-toolbar.text-white.row.q-py-xs
              q-btn(icon="mdi-file-gif-box" flat round :disabled="sendingBusy")
                q-menu(ref="tenorMenu")
                  q-card.bg-white(style="width: 300px; max-height: 400px")
                    TenorComponent(@select="ev => { $refs.tenorMenu.hide(); insertGif(ev) }")

              q-btn(icon="mdi-emoticon-happy-outline" flat round :disabled="sendingBusy")
                q-menu
                  EmojiPicker(:native="true" @select="insertEmoji" theme="light")

              q-input.q-ml-sm(
                rounded outlined dense class="WAL__field col-grow q-mr-sm"
                v-model="newMessage.content" placeholder="Digite uma mensagem..." type="textarea" rows="1"
                borderless clearable autofocus autogrow @clear="newMessage.content = ''"
                @keydown.enter.exact.prevent="$refs.form.submit($event)"
                :readonly="sendingBusy" :bg-color="sendingBusy ? 'aqua' : 'white'"
              )
              transition(
                appear
                enter-active-class="animated jello slower"
                leave-active-class="animated fadeOut"
              )
                q-btn(
                  flat type="submit"
                  :disabled="!newMessage.content.length && newMessage.mediaUrl.length === 0"
                  :loading="sendingBusy"
                  :round="!newMessage.id" :rounded="!!newMessage.id"
                  :label="newMessage.id ? 'Editar' : undefined"
                  :icon-right="newMessage.id ? 'send' : undefined"
                  :icon="newMessage.id ? undefined : 'send'"
                )

</template>

<script setup lang="ts">
import { Dialog, Notify, Screen, useQuasar, openURL } from 'quasar';
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import formatters from '../../utils/formatters';
import { useWalletStore, useUsersStore, useUserStore } from '../../stores';
import { useProfile } from './useProfile';
import { useChat } from './useChat';
import { useMessageFeeder } from './useMessageFeeder';
import { getFaucet, getNetwork } from '../../move';
import UsersList from './UsersList.vue';
import ChatList from './ChatList.vue';
import DmChatRoom from './DmChatRoom/DmChatRoom.vue';
import CreateRoomDialog from './CreateRoomDialog.vue';
import EditProfileDialog from './EditProfileDialog.vue';
import { onBeforeUnmount } from 'vue';

const $q = useQuasar();

const walletStore = useWalletStore();
const userStore = useUserStore();
const usersStore = useUsersStore();

const chatService = useChat();
const feeder = useMessageFeeder();

feeder.start();

const { latestMessages } = feeder;

const { shortenAddress, formatFullDate } = formatters;
const { disconnect, deleteProfile, editProfile } = useProfile();
const { createRoom, insertEmoji, insertGif, removeGif, getDmParticipantId } = chatService;
const { newMessage, clearNewMessage } = chatService;
const { activeChatRoom } = storeToRefs(chatService.chatRoomStore);
const { breakpoint, screenWidth, desktopMode, drawerWidth, leftDrawerOpen, rightDrawerOpen } = chatService;

const style = computed(() => ({ height: $q.screen.height + 'px' }));
const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value; };
const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };

const { shortAddress } = storeToRefs(walletStore);
const { profile, suiBalanceFormatted } = storeToRefs(userStore);
const { users } = storeToRefs(usersStore);
const dmParticipantId = computed(() => getDmParticipantId(activeChatRoom.value!));
const tab = ref<'mensagens' | 'users'>('mensagens');

const sendingBusy = ref(false);
const sendMessage = async () => {
  sendingBusy.value = true;
  try {
    await chatService.sendMessage();
  } finally {
    sendingBusy.value = false;
  }
};

const getSuiFaucet = async () => {
  if (profile.value) {
    try {
      await getFaucet(profile.value?.owner);
      await userStore.fetchCurrentUserProfile();
    } catch {
      openURL(`https://faucet.sui.io/?network=${getNetwork()}`);
    }
  }
}


onMounted(async () => {

  $q.loading.show();
  try {
    const connected = await walletStore.autoConnect();
    if (connected) {
      await userStore.fetchCurrentUserProfile();
      await usersStore.fetchAllUsersProfiles();
      await chatService.chatRoomStore.fetchAllUserChatRoom();
    }
  } finally {
    $q.loading.hide();
  }
});

onBeforeUnmount(() => {
  feeder.stop();
})

</script>

<style lang="scss" scoped>
.WAL {
  width: 100%;
  height: 100%;
  padding-top: 20px;
  padding-bottom: 20px;

  &__layout {
    margin: 0 auto;
    z-index: 4000;
    height: 100%;
    width: 90%;
    max-width: 1450px;
    border-radius: 5px;

    background: linear-gradient(to top, $blue-grey-1, $blue-grey-2);
  }

  &__field.q-field--outlined .q-field__control:before {
    border: none;
  }

  .q-drawer--standard {
    .WAL__drawer-close {
      display: none;
    }
  }
}

@media (max-width: 850px) {
  .WAL {
    padding: 0;
    &__layout {
      width: 100%;
      border-radius: 0;
    }
  }
}


.card-box {
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  margin-bottom: 4px;
  box-shadow: 0px 0px 1px rgba(0,0,0,0.2);
}

$chat-message-border-radius: 12px;
:deep(.q-message) {
  .q-message-text {
    padding-bottom: 2px;
  }
  .q-message-stamp {
    font-size: 12px;
  }
  .q-message-text--received {
    border-radius: $chat-message-border-radius $chat-message-border-radius $chat-message-border-radius 0 !important;
    max-width: 600px;
  }
  .q-message-text--sent {
    border-radius: $chat-message-border-radius $chat-message-border-radius 0 $chat-message-border-radius !important;
    max-width: 600px;
  }
}

.footer-edit-mode {
  box-shadow: 0px 0px 10px 10px $ocean;
  background: $light-ocean;
}
</style>
