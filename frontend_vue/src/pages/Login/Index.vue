<template lang="pug">
q-layout.bg-sea
  q-page-container.text-white
    q-page.row.items-center.justify-evenly
      WavesBackground(:top="screenHeight / 1.3" :height="150")

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

      .absolute-bottom-right
        DeployLabel

      .flex.flex-center.column
        q-card.flex.flex-center.text-ocean.shadow-20.card-box
          q-card-section
            .rows.flex-center.q-gutter-y-lg
              .flex.flex-center.items-center
                q-img(src="/logo_sui_chat_bordered.png" width="78px")
                .text-h3.text-ocean.q-ml-sm SuiChat

              .text-center
                ConnectButton(glossy push color="medium-sea" rounded)

      .absolute-top-right.q-ma-md
        SettingsMenu

</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter  } from 'vue-router';
import ConnectButton from '../../components/ConnectButton.vue';
import WavesBackground from '../../components/WavesBackground.vue';
import { Dialog, Screen } from 'quasar';
import SettingsMenu from '../../components/SettingsMenu.vue';
import DeployLabel from '../../components/DeployLabel.vue';

const router = useRouter();
const screenHeight = computed(() => Screen.height);

</script>
<style lang="scss" scoped>
.card-box {
  margin: 8px;
  border-radius: 16px;
  min-width: 260px;
  max-width: 80vw;
  border-top: 8px solid $medium-sea;
  padding: 16px;
}
</style>
