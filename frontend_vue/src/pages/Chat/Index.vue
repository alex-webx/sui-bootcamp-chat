<template lang="pug">
.WAL.position-relative.bg-ocean(:style="style" v-if="profile")
  WavesBackground(:top="100" :height="200")
  .absolute-top-right.q-ma-md
    SettingsMenu(:readonly="true" :show-settings="false")
  .absolute-bottom-right
    DeployLabel

  transition(
    appear
    enter-active-class="animated bounceIn slower"
  )
    q-layout.WAL__layout.shadow-3(
      view="lHh LpR lFr" container
      v-if="!loading"
    )

      HeaderToolbar

      LeftDrawer

      RightDrawer

      //----- CONTENT -----------------------------------------------------------------------------------------------------------------

      q-page-container(
        style="display: flex; flex-direction: column; min-height: calc(100vh - 40px)"
        :key="activeChat?.id || 0"
      )
        template(v-if="activeChat")

          //- transition(
          //-   appear
          //-   enter-active-class="animated tada slower"
          //-   leave-active-class="animated bounceOutUp"
          //- )
          //-   .q-pa-md.row.justify-center.full-width(
          //-     v-if="!messageBlocks?.length"
          //-     style="margin-top: auto; margin-bottom: auto"
          //-   )
          //-     .flex.flex-center.column
          //-       img(src="/logo.png" style="width: 200px; opacity: 1;")

          GroupRoom(
            v-if="activeChat.roomType === 1 || activeChat.roomType === 2"
          )

          DmChatRoom(
            v-else-if="activeChat.roomType === 3"
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

      template(v-if="activeChat")
        FooterToolbar

</template>

<script setup lang="ts">
import { Loading, useQuasar, Screen } from 'quasar';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useWalletStore, useUserStore, useChatListStore, useUiStore } from '../../stores';
import { db } from '../../utils/dexie';

import HeaderToolbar from './HeaderToolbar/HeaderToolbar.vue';
import LeftDrawer from './LeftDrawer/LeftDrawer.vue';
import RightDrawer from './RightDrawer/RightDrawer.vue';
import FooterToolbar from './FooterToolbar/FooterToolbar.vue';
import DmChatRoom from './DmChatRoom/DmChatRoom.vue';
import GroupRoom from './GroupRoom/GroupRoom.vue';

const walletStore = useWalletStore();
const userStore = useUserStore();
const chatListStore = useChatListStore();

const style = computed(() => ({ height: Screen.height + 'px' }));
const loading = ref(true);

const { profile } = storeToRefs(userStore);
const { activeChat } = storeToRefs(chatListStore);
const dbControls = ref<Awaited<ReturnType<typeof db.initDatabase>>>();

onMounted(async () => {
  Loading.show();
  loading.value = true;
  try {
    const connected = await walletStore.autoConnect();
    if (connected) {
      await userStore.fetchCurrentUserProfile();
      dbControls.value = await db.initDatabase(walletStore.address!);
    }
  } finally {
    loading.value = false;
    Loading.hide();
  }
});

onUnmounted(async () => {
  dbControls.value?.stopLoop();
});

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
</style>
