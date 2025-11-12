<template lang="pug">
q-layout.bg-sea
  q-page-container.text-white
    WavesBackground
    q-page.column.items-center.justify-evenly
      .flex.flex-center.column.q-gutter-y-md
        .text-h5 Deployment error
        .text-caption Wrong environment, wrong package id, wrong object id

        SettingsMenu

        JsonViewer(:data="constants")

</template>

<script setup lang="ts">
import Constants, { getAllConstants } from './constants';
import SettingsMenu from './components/SettingsMenu.vue';
import WavesBackground from './components/WavesBackground.vue';
import { useAppStore } from './stores/appStore';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const appStore = useAppStore();
const constants = getAllConstants();

onMounted(async () => {
  const deployOk = await appStore.checkDeploy();
  if (deployOk) {
    await appStore.resetState();
    router.push({ name: 'login' });
  }
});


</script>
