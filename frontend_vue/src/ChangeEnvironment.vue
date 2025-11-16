<template lang="pug">
q-layout.bg-sea
  q-page-container.text-white
    WavesBackground(:top="100" :height="200")
    q-page.column.items-center.justify-evenly
      .flex.flex-center.column.q-gutter-y-md
        .text-h6 Configurações de variáveis de ambiente

        SettingsMenu(:outlined="true" bg-color="medium-sea" :hide-dropdown-icon="false")

        .flex.flex-center.column
          .text-subtitle1 Network configuration
          vue-json-pretty(:data="networkConfigs")

        .flex.flex-center.column
          .text-subtitle1 Client configuration
          vue-json-pretty(:data="clientConfigs")

        .flex.flex-center.column
          .row-items-center.q-col-gutter-lg(v-if="deployOk === true")
            .col-xs-12.text-center.items-center.q-gutter-x-md.text-h6
              | Deploy OK
              q-icon(name="mdi-check-bold" color="positive" size="lg")
            .col-xs-12.text-center
              q-btn(
                label="Voltar para o App"
                color="medium-sea" push glossy size="lg"
                :to="{ name: 'login' }"
              )

          .row.items-center.q-col-gutter-lg(v-else-if="deployOk === false")
            .col-xs-auto
              q-icon(name="mdi-alert-outline" color="warning" size="lg")
            .col
              .text-h6 Deploy Não OK
              div Erro na configuração do projeto para o atual ambiente selecionado


          .column.items-center.q-col-gutter-lg(v-else)
            .text-h6 Verificando...
            div
              q-spinner-hourglass(size="xl" color="yellow")




</template>

<script setup lang="ts">
import { useConfig } from '../configs';
import SettingsMenu from './components/SettingsMenu.vue';
import WavesBackground from './components/WavesBackground.vue';
import { useAppStore } from './stores/appStore';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const appStore = useAppStore();
const config = useConfig();
const networkConfigs = config.getAllNetworkConfigs();
const clientConfigs = config.getAllClientConfigs();
const deployOk = ref<boolean>();

onMounted(async () => {
  deployOk.value = await appStore.checkDeploy();
});


</script>
