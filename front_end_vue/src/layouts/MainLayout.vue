<template lang="pug">
q-layout(view="lHh Lpr lFf")
  q-header(elevated)
    q-toolbar
      q-btn(
        flat
        dense
        round
        icon="menu"
        aria-label="Menu"
        @click="toggleLeftDrawer"
      )

      q-toolbar-title
        | SUI BootCamp Novembro - Chat

      ConnectButton

  q-drawer(
    v-model="leftDrawerOpen"
    show-if-above
    bordered
  )
    ChatList
    q-list
      q-item-label(header)
        q-btn(
          label="Get user profile"
          @click="getUserProfiles()"
        )
      q-item-label(header)
        q-btn(
          label="Create user profile"
          @click="createUserProfiles()"
        )

  q-page-container
    router-view
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ConnectButton from '../components/ConnectButton.vue';
import ChatList from '../components/ChatList.vue';
import { useUserProfileStore } from '../stores/userProfileStore';

const leftDrawerOpen = ref(false);
const userProfileStore = useUserProfileStore();

console.log('package id', process.env.PACKAGE_ID);

const getUserProfiles = async () => {    
  const profiles = await userProfileStore.fetchUserProfiles();
  console.log('profiles', profiles);
};

const createUserProfiles = async () => {
  const profiles = await userProfileStore.createProfile('Alexandre 1');
}

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
