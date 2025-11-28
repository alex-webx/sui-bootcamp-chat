<template lang="pug">
//----- LEFT DRAWER -----------------------------------------------------------------------------------------------------------------
q-drawer.bg-grey-2(
  v-model="leftDrawerOpen"
  show-if-above
  :breakpoint="breakpoint" dark
  :width="drawerWidth"
)
  q-toolbar.bg-deep-sea.q-pr-none

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
            q-item-section
              q-item-label Excluir perfil
              q-item-label(caption) [desabilitado]
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
      q-tab(name="messages" label="Mensagens")
      q-tab(name="explore" label="Explorar")

    q-tab-panels(v-model="tab" animated)
      q-tab-panel.q-pa-none(name="messages")
        ChatList
      q-tab-panel.q-pa-none(name="explore")
        ExploreList

</template>

<script setup lang="ts">
import { useQuasar, openURL, Dialog } from 'quasar';
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useWalletStore, useUserStore, useUiStore } from '../../../stores';
import { useProfile } from '../useProfile';
import { getFaucet, getNetwork } from '../../../move';

import ExploreList from './ExploreList.vue';
import ChatList from './ChatList.vue';
import CreateRoomDialog from '../CreateRoomDialog.vue';

const walletStore = useWalletStore();
const userStore = useUserStore();
const uiStore = useUiStore();

const { disconnect, deleteProfile, editProfile } = useProfile();
const { breakpoint, drawerWidth, leftDrawerOpen } = storeToRefs(uiStore);

const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value; };

const { shortAddress } = storeToRefs(walletStore);
const { profile, suiBalanceFormatted } = storeToRefs(userStore);

const tab = ref<'messages' | 'explore'>('messages');

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

const createRoom = async () => {
  Dialog.create({
    component: CreateRoomDialog
  });
};
</script>

<style lang="scss" scoped>
.WAL__drawer-close {
  display: none;
}
</style>
