<template lang="pug">
//----- HEADER -----------------------------------------------------------------------------------------------------------------

q-header(elevated dark)
  q-toolbar.bg-deep-sea.text-white
    q-btn.q-mr-sm(
      round flat
      icon="keyboard_arrow_left"
      @click="toggleLeftDrawer()"
      v-if="!desktopMode"
    )

    div(v-if="activeChat")
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
              q-img(:src="activeChat.imageUrl || dmUser?.avatarUrl || '/logo_sui_chat.png'" :ratio="1" fit="cover")

          span.text-subtitle1.q-pl-sm
            | {{ activeChat.name || dmUser?.username }}

    q-space

</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import _ from 'lodash';
import { useChatListStore, useUiStore, useUserStore } from '../../../stores';
import { db, useLiveQuery } from '../../../utils/dexie';
import { ERoomType } from '../../../move';

const userStore = useUserStore();
const chatListStore = useChatListStore();
const uiStore = useUiStore();

const { desktopMode, leftDrawerOpen, rightDrawerOpen } = storeToRefs(uiStore);

const toggleLeftDrawer = () => { leftDrawerOpen.value = !leftDrawerOpen.value; };
const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };

const { activeChat } = storeToRefs(chatListStore);

const isDM = computed(() => activeChat.value?.roomType === ERoomType.DirectMessage);
const dmUserAddress = computed(() => isDM.value ? _.findKey(activeChat.value?.members, (v, k) => k !== userStore.profile?.owner) : null);
const dmUser = useLiveQuery(() => dmUserAddress.value ? db.profile.get(dmUserAddress.value) : null, [ dmUserAddress ]);

</script>

<style lang="scss" scoped>
</style>
