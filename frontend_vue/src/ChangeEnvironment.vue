<template lang="pug">
q-layout.bg-sea
  q-page-container.text-white
    WavesBackground
    q-page.column.items-center.justify-evenly
      .flex.flex-center.column.q-gutter-y-md
        .text-h6 Configurações de variáveis de ambiente

        SettingsMenu(:outlined="true" bg-color="medium-sea" :hide-dropdown-icon="false")

        .flex.flex-center
          .text-subtitle1 Network configuration
          JsonViewer(:data="networkConfigs" :darkMode="true")

        .flex.flex-center
          .text-subtitle1 Client configuration
          JsonViewer(:data="clientConfigs" :darkMode="true")

        .flex.flex-center.column
          .row-items-center.q-col-gutter-lg(v-if="deployOk")
            .col-xs-12.text-center.flex.items-center.q-gutter-x-md
              q-icon(name="mdi-check-bold" color="positive" size="lg")
              .text-h6 Deploy OK
            .col-xs-12.text-center
              q-btn(
                label="Voltar para o App"
                color="medium-sea" push glossy
                :to="{ name: 'login' }"
              )

          .row.items-center.q-col-gutter-lg(v-else)
            .col-xs-auto
              q-icon(name="mdi-alert-outline" color="warning" size="lg")
            .col
              .text-h6 Deploy Não OK
              div Erro na configuração do projeto para o atual ambiente selecionado


</template>

<script setup lang="ts">
import { getAllNetworkConfigs, getAllClientConfigs } from '../configs';
import SettingsMenu from './components/SettingsMenu.vue';
import WavesBackground from './components/WavesBackground.vue';
import { useAppStore } from './stores/appStore';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const appStore = useAppStore();
const networkConfigs = getAllNetworkConfigs();
const clientConfigs = getAllClientConfigs();
const deployOk = ref(false);

onMounted(async () => {
  deployOk.value = await appStore.checkDeploy();

  // if (deployOk) {
  //   await appStore.resetState();
  //   router.push({ name: 'login' });
  // }
});


</script>
