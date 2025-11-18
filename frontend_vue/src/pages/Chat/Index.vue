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

    q-drawer.bg-grey-2(
      v-model="leftDrawerOpen"
      show-if-above
      :breakpoint="breakpoint" dark
      :width="drawerWidth"
    )
      q-toolbar.bg-deep-sea

        q-avatar.cursor-pointer(@click="editProfile()")
          q-img(:src="profile.avatarUrl" :ratio="1" fit="cover" error-src="/user-circles-set-sm.png")

        .q-ml-md.cursor-pointer(@click="editProfile()")
          .text-weight-bold
            | {{ profile?.username }}
          .text-caption.text-aqua
            | {{ shortAddress }}

        q-space

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
          q-tab(name="chats" label="Salas")
          q-tab(name="users" label="Usuários")

        q-tab-panels(v-model="tab" animated)
          q-tab-panel.q-pa-none(name="chats")
            ChatList
          q-tab-panel.q-pa-none(name="users")
            UsersList

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


    q-page-container(style="display: flex; flex-direction: column; overflow: auto; min-height: calc(100vh - 40px)" :key="activeChatRoom?.id || 0")
      template(v-if="activeChatRoom")

        ChatRoom(
          ref="chatRoomComponent"
          v-if="activeChatRoom.roomType === 1"
        )
          template(#empty)
            q-card.rounded-borders
              .flex.flex-center.column.q-ma-lg
                q-icon(name="mdi-chat-sleep-outline" size="100px" color="medium-sea")
                q-card-section Nenhum mensagem no grupo

        ChatRoomDM(
          ref="chatRoomComponent"
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
            img(src="/logo_sui_chat_bordered.png" style="width: 200px; opacity: 0.2")

    template(v-if="activeChatRoom")
      transition(
        appear
        enter-active-class="animated fadeInUp slower"
        leave-active-class="animated fadeOut slower"
      )
        q-footer.bg-transparent
          q-form(@submit="sendMessage()" ref="form")
            .row.justify-end.full-width.new-media(
              v-if="newMessage.mediaUrl?.length"
              style="margin-top: auto;"
            )
              .flex.bg-deep-sea.text-white.q-pa-md.q-pt-none(style="width: 30%; border-top-left-radius: 16px")
                q-btn(icon="close" flat round @click="removeGif()")
                div
                  video.fit(autoplay loop muted playisline)
                    source(:src="newMessage.mediaUrl[0]")

            q-toolbar.bg-deep-sea.text-white.row.q-py-xs
              q-btn(icon="mdi-file-gif-box" flat round)
                q-menu(ref="tenorMenu")
                  q-card.bg-white(style="width: 300px; max-height: 400px")
                    TenorComponent(@select="ev => { $refs.tenorMenu.hide(); insertGif(ev) }")

              q-btn(icon="mdi-emoticon-happy-outline" flat round)
                q-menu
                  EmojiPicker(:native="true" @select="insertEmoji" theme="light")

              q-input.q-ml-sm(
                rounded outlined dense class="WAL__field col-grow q-mr-sm" bg-color="white"
                v-model="newMessage.content" placeholder="Digite uma mensagem..." type="textarea" rows="1"
                borderless clearable autofocus autogrow @clear="newMessage.content = ''"
                @keydown.enter.exact.prevent="$refs.form.submit($event)"
              )
              q-btn(round flat icon="send" type="submit" :disabled="!newMessage.content.length && newMessage.mediaUrl.length === 0")

</template>

<script setup lang="ts">
import { Dialog, Notify, Screen, useQuasar } from 'quasar';
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import formatters from '../../utils/formatters';
import { useWalletStore } from '../../stores/walletStore';
import { useUserStore } from '../../stores/userStore';
import { useUsersStore } from '../../stores/usersStore';
import UsersList from './UsersList.vue';
import ChatList from './ChatList.vue';
import ChatRoom from './ChatRoom.vue';
import ChatRoomDM from './ChatRoomDM.vue';
import CreateRoomDialog from './CreateRoomDialog.vue';
import EditProfileDialog from './EditProfileDialog.vue';
import { useProfile } from './useProfile';
import { useChat } from './useChat';

const $q = useQuasar();

const walletStore = useWalletStore();
const userStore = useUserStore();
const usersStore = useUsersStore();

const chatService = useChat();

const { disconnect, deleteProfile, editProfile } = useProfile();
const { createRoom, insertEmoji, insertGif, removeGif, sendMessage, getDmParticipantId } = chatService;
const { newMessage } = chatService;
const { activeChatRoom } = storeToRefs(chatService.chatRoomStore);

const breakpoint = 800;
const screenWidth = computed(() => Screen.width);
const desktopMode = computed(() => Screen.width > breakpoint);
const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);

const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(false);

const chatRoomComponent = ref<InstanceType<typeof ChatRoom>>();

const shortAddress = computed(() => walletStore.shortAddress);
const profile = computed(() => userStore.profile);
const tab = ref<'chats' | 'users'>('chats');
const { users } = storeToRefs(usersStore);

const dmParticipantId = computed(() => getDmParticipantId(activeChatRoom.value!));
const style = computed(() => ({ height: $q.screen.height + 'px' }));
const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value; };
const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };
const { shortenAddress, formatFullDate } = formatters;

onMounted(async () => {

  $q.loading.show();
  try {
    const connected = await walletStore.autoConnect();
    if (connected) {
      await userStore.fetchCurrentUserProfile();
      await usersStore.fetchAllUsersProfiles();
      await chatService.chatRoomStore.fetchAllUserChatRoom();
      //await chatService.chatRoomStore.fetchAllChatRooms();
    }
  } finally {
    $q.loading.hide();
  }
});

</script>

<style lang="scss" scoped>
$heightBanner: 260px;

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

.new-media {
  > div { z-index: 1; }
  &::before {
    content: ' ';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba($sea, 0.3);
    backdrop-filter: blur(4px);
    // animation: blink 0.4s infinite alternate;
    // @keyframes blink {
    //   0% { background: rgba($sea, 0.3); }
    //   100% { background: rgba($sea, 0.2); }
    // }
  }
}
</style>
