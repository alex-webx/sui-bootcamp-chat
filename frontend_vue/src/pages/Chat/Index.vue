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
          .text-subtitle2 {{ activeChatRoom.name }}
          .text-caption {{ activeChatRoom.messageCount }} {{activeChatRoom.messageCount > 1 ? 'mensagens' : 'mensagem' }}

      .q-ma-none.flex.column.q-px-md.q-py-md.q-gutter-y-sm.card-box.text-caption(style="line-height: 11px")
        div Criado em: {{ formatFullDate(activeChatRoom.createdAt) }}
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
          q-btn(icon="mdi-file-gif-box" flat round)
            q-menu
              q-card.bg-white(style="width: 300px; max-height: 400px")
                TenorComponent(@select="insertGif")

          q-btn(icon="mdi-sticker-emoji" flat round)
            q-menu
              EmojiPicker(:native="true" @select="insertEmoji" theme="light")
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
import formatters from '../../utils/formatters';
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
import EditProfileDialog from './EditProfileDialog.vue';
import SettingsMenu from '../../components/SettingsMenu.vue';
import DeployLabel from '../../components/DeployLabel.vue';
import TenorComponent, { type TenorResult }  from '../../components/TenorComponent.vue';

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
const { shortenAddress, formatFullDate } = formatters;

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
    await router.push({ name: 'login' });
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

const editProfile = async () => {
  Dialog.create({
    component: EditProfileDialog
  }).onOk(async (updatedUserProfile: Parameters<typeof userStore.updateUserProfile>[0]) => {
    const notif = Notify.create({
      message: 'Atualizando dados do seu perfil...',
      caption: 'Por favor, assine a transação em sua carteira.',
      color: 'primary',
      spinner: true,
      group: false,
      timeout: 0
    });

    try {
      const response = await userStore.updateUserProfile(updatedUserProfile);
      if (response) {
        notif({
          message: 'Perfil atualizado com sucesso!',
          caption: '',
          timeout: 2500,
          spinner: false,
          icon: 'done',
          color: 'positive'
        });
        await userStore.fetchCurrentUserProfile();
      } else {
        notif({
          message: 'Não foi possível atualizar o seu perfil.',
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
        message: 'Não foi possível atualizar o seu perfil.',
        caption: 'Ocorreu um erro: ' + exc,
        timeout: 2500,
        spinner: false,
        icon: 'done',
        color: 'negative'
      });
    }
  });
};

const createRoom = async () => {
  Dialog.create({
    component: CreateRoomDialog
  });
};

const insertGif = async (gif: TenorResult) => {
  // message.value += gif.media_formats.mp4.url;
  alert('TODO');
};

const insertEmoji = (emoji: { i: string }) => {
  message.value += emoji.i;
}

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
    const connected = await walletStore.autoConnect();
    if (connected) {
      await userStore.fetchCurrentUserProfile();
      // await chatRoomStore.fetchAllChatRooms();
      // await usersStore.fetchAllUsersProfiles();
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
