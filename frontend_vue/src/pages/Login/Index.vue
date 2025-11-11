<template lang="pug">
q-layout.bg-sea
  q-page-container.text-white
    q-page.row.items-center.justify-evenly
      WavesBackground(:top="screenHeight / 1.3" :height="150")

      .flex.flex-center.column
        q-card.flex.flex-center.text-ocean.shadow-20(style="border-radius: 16px; min-width: 450px; min-height: 200px")
          q-card-section.q-mb-lg
            .rows.flex-center
              .flex.flex-center
                q-img(src="/logo-transp.png" width="100px")
                span.text-h4 Sui Chat

              .text-center
                ConnectButton(glossy push color="medium-sea" rounded)

      .absolute-bottom.text-center.text-caption
        div
          | 2025 | Powered by SUI
        div
          span Desenvolvido por
          q-btn(
            flat dense no-caps
            href="https://github.com/alex-webx" target="_blank"
            label="alex-webx" icon-right="mdi-github" size="md"
          )

      .absolute-top-right.q-ma-md
        SettingsMenu

</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter  } from 'vue-router';
import { useSuiClientStore } from '../../stores/suiClientStore';
import ConnectButton from '../../components/ConnectButton.vue';
import WavesBackground from '../../components/WavesBackground.vue';
import { Dialog, Screen } from 'quasar';
import SettingsMenu from '../../components/SettingsMenu.vue';
import { storeToRefs } from 'pinia';

const router = useRouter();
const screenHeight = computed(() => Screen.height);

</script>
<style lang="scss" scoped>
</style>
