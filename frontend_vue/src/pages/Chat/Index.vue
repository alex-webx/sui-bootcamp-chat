<template lang="pug">
.WAL.position-relative.bg-ocean(:style="style")
  WavesBackground(:top="100" :height="200")
  .absolute-top-right.q-ma-md
    SettingsMenu(:readonly="true" :show-settings="false")

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

        div.cursor-pointer(
          v-if="activeChatRoom"
          @click="toggleRighttDrawer()"
        )
          q-btn(round flat)
            q-avatar
              img(:src="activeChatRoom.imageUrl || '/logo_sui_chat.png'")

          span.q-subtitle-1.q-pl-md
            | {{ activeChatRoom.name }}

        q-space

        //- q-btn(round flat icon="more_vert")
          q-menu(auto-close :offset="[110, 0]")
            q-list(style="min-width: 150px")
              q-item(clickable)
                q-item-section Contact data
              q-item(clickable)
                q-item-section Block
              q-item(clickable)
                q-item-section Select messages
              q-item(clickable)
                q-item-section Silence
              q-item(clickable)
                q-item-section Clear messages
              q-item(clickable)
                q-item-section Erase messages

    q-drawer.bg-grey-2(
      v-model="leftDrawerOpen"
      show-if-above
      :breakpoint="breakpoint" dark
      :width="drawerWidth"
    )
      q-toolbar.bg-deep-sea
        q-avatar
          q-img(:src="profile?.avatarUrl || '/logo_sui_chat.png'" error-src="/logo_sui_chat.png")
        .q-ml-md
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
              q-item(clickable @click="deleteProfile()")
                q-item-section(avatar)
                  q-icon(name="mdi-account-cancel" color="sea")
                q-item-section Excluir perfil
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

      .q-ma-none.flex.flex-center.column.q-py-md.q-gutter-y-sm.card-box
        div
          q-avatar(size="80px")
            q-img(:src="activeChatRoom.imageUrl")
        .text-center
          div {{ screenWidth }} - {{desktopMode}} - {{rightDrawerOpen}}
          .text-subtitle2 {{ activeChatRoom.name }}
          .text-caption {{ activeChatRoom.messageCount }} {{activeChatRoom.messageCount > 1 ? 'mensagens' : 'mensagem' }}

      .q-ma-none.flex.column.q-px-md.q-py-md.q-gutter-y-sm.card-box.text-caption(style="line-height: 11px")
        div Criado em: {{ formatDate(activeChatRoom.createdAt) }}
        div ID do chat: {{ shortenAddress(activeChatRoom.id) }}
        div Bloco de mensagens atual: {{ activeChatRoom.currentBlockNumber }}

      .q-ma-none.flex.flex-center.column.q-py-sm.q-gutter-y-sm.card-box
        q-list.full-width
          q-item Participantes
          q-item
            q-item-section(avatar)
              q-avatar
                q-img(:src="addressToProfileMap[activeChatRoom.owner]?.avatarUrl")
            q-item-section
              q-item-label {{ addressToProfileMap[activeChatRoom.owner]?.username }}
              q-item-label(caption) {{ shortenAddress(activeChatRoom.owner) }}
            q-item-section(side)
              q-item-label
                q-chip(size="sm" color="grey-3") Administrador

      //- JsonViewer(
      //-   :data="activeChatRoom"
      //-   :dark-mode="false"
      //- )

    q-page-container(style="display: flex; flex-direction: column; overflow: auto; min-height: calc(100vh - 40px)")
      ChatRoom(
        v-if="activeChatRoom" ref="chatRoomComponent"
        :key="activeChatRoom.id"
      )
      .q-pa-md.row.justify-center.full-width(v-else style="margin-top: auto; margin-bottom: auto")
        transition(
          appear
          enter-active-class="animated jello slower"
          leave-active-class="animated fadeOut"
        )
          img(src="/logo_sui_chat_bordered.png" style="width: 200px; opacity: 0.2")

    q-footer(v-if="activeChatRoom")
      q-form(@submit="sendMessage()" ref="form")
        q-toolbar.bg-deep-sea.text-white.row.q-py-xs
          //- q-btn.q-mr-sm(round flat icon="insert_emoticon")
          q-input(
            rounded outlined dense class="WAL__field col-grow q-mr-sm" bg-color="white"
            v-model="message" placeholder="Digite uma mensagem..." type="textarea" rows="1"
            borderless clearable autofocus autogrow
            @keydown.enter.exact.prevent="$refs.form.submit($event)"
          )
          q-btn(round flat icon="send" type="submit" :disabled="!message.length")

</template>

<script setup lang="ts">
import { Dialog, Notify, Screen, useQuasar } from 'quasar';
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useWalletStore } from '../../stores/walletStore';
import { useUserStore } from '../../stores/userStore';
import { useUsersStore } from '../../stores/usersStore';
import { useChatRoomStore } from '../../stores/chatRoomStore';
import moment from 'moment';
import WavesBackground from '../../components/WavesBackground.vue';
import UsersList from './UsersList.vue';
import ChatList from './ChatList.vue';
import ChatRoom from './ChatRoom.vue';
import CreateRoomDialog from './CreateRoomDialog.vue';
import SettingsMenu from '../../components/SettingsMenu.vue';

const walletStore = useWalletStore();
const userStore = useUserStore();
const usersStore = useUsersStore();
const chatRoomStore = useChatRoomStore();

const $q = useQuasar();
const router = useRouter();

const breakpoint = 800;
const screenWidth = computed(() => Screen.width);
const desktopMode = computed(() => Screen.width > breakpoint);
const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);

const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(false);
const message = ref('');
const chatRoomComponent = ref<InstanceType<typeof ChatRoom>>();

const shortAddress = computed(() => walletStore.shortAddress);
const profile = computed(() => userStore.profile);
const tab = ref<'chats' | 'users'>('chats');
const { activeChatRoom } = storeToRefs(chatRoomStore);
const { addressToProfileMap } = storeToRefs(usersStore);

const style = computed(() => ({ height: $q.screen.height + 'px' }));
const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value; };
const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };
const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const formatDate = (date: string) => moment(Number(date)).format('DD/MM/YYYY [às] HH:MM:ss')

const disconnect = async (silently = false) => {
  const shouldDisconnect = await new Promise((resolve) => {

    if (silently) { resolve(true); }

    Dialog.create({
      title: 'Tem certeza que deseja desconectar sua carteira?',
      cancel: {
        label: 'Cancelar',
        color: 'grey',
        flat: true
      },
      ok: {
        label: 'Desconectar',
        color: 'primary'
      }
    }).onOk(async () => {
      resolve(true);
    }).onDismiss(() => {
      resolve(false);
    });
  });

  if (shouldDisconnect) {
    await walletStore.disconnect();
    router.push({ name: 'login' });
  }
}

const deleteProfile = async () => {
  Dialog.create({
    title: 'Tem certeza que deseja excluir o seu perfil?',
    message: 'Esta operação não poderá ser desfeita.',
    cancel: {
      label: 'Cancelar',
      color: 'grey',
      flat: true
    },
    ok: {
      label: 'Excluir perfil'
    }
  }).onOk(async () => {
    const success = await userStore.deleteUserProfile();
    if (success === true) {
      disconnect(true);
      Notify.create({
        message: 'Perfil excluído com sucesso',
        color: 'primary'
      })
    }
  });
};

const createRoom = async () => {
  Dialog.create({
    component: CreateRoomDialog
  }).onOk(async (newChatRoom: Parameters<typeof chatRoomStore.createChatRoom>[0]) => {
    const notif = Notify.create({
      message: 'Criando sala de chat...',
      caption: 'Por favor, assine a transação em sua carteira.',
      color: 'primary',
      spinner: true,
      group: false,
      timeout: 0
    });

    try {
      const response = await chatRoomStore.createChatRoom(newChatRoom);
      if (response?.chatRoomId) {
        notif({
          message: 'Sala de chat criada com sucesso',
          caption: '',
          timeout: 2500,
          spinner: false,
          icon: 'done',
          color: 'positive'
        });
        await chatRoomStore.fetchChatRooms();
        await userStore.fetchCurrentUserProfile();
        chatRoomStore.activeChatRoomId = response.chatRoomId;
      } else {
        notif({
          message: 'Não foi possível criar a sala de chat',
          caption: '',
          timeout: 2500,
          spinner: false,
          icon: 'done',
          color: 'negative'
        });
      }
    } catch (exc) {
      console.log({exc});
      notif({
        message: 'Não foi possível criar a sala de chat',
        caption: 'Ocorreu um erro: ' + exc,
        timeout: 2500,
        spinner: false,
        icon: 'done',
        color: 'negative'
      });
    }
  });
};

const sendMessage = async () => {
  if (profile.value && activeChatRoom.value) {
    await chatRoomStore.sendMessage(
      profile.value.id,
      {
        content: message.value,
        roomId: activeChatRoom.value.id
      }
    );
    chatRoomComponent.value?.fetchMessages();
    message.value = '';
    if ((profile.value.roomsJoined || []).indexOf(activeChatRoom.value.id) < 0) {
      await userStore.fetchCurrentUserProfile();
    }
  }
}

onMounted(async () => {

  $q.loading.show();
  try {
    await walletStore.detectWallets();
    const connected = await walletStore.autoConnect();
    if (connected) {
      await userStore.fetchCurrentUserProfile();
      await chatRoomStore.fetchChatRooms();
      await usersStore.fetchAllUsersProfiles();
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
</style>
