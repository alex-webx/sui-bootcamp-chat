<template lang="pug">
q-layout.bg-ocean
  q-page-container.text-white
    q-page.column.items-center.justify-start

      .flex
        q-btn(icon="mdi-file-gif-box" flat round)
          q-menu
            q-card.bg-white(style="width: 300px; max-height: 400px")
              TenorComponent(@select="selectGif")

        q-btn(icon="mdi-sticker-emoji" flat round)
          q-menu
            EmojiPicker(:native="true" @select="selectEmoji" theme="light")

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TenorComponent, { type TenorResult }  from './components/TenorComponent.vue';

const selectGif = async (gif: TenorResult) => {
  console.log({gif});
};

const selectEmoji = (emoji: any) => {
  console.log({emoji});
}

</script>
