<template lang="pug">
  q-btn(
    v-bind="$attrs"
    :loading="isLoading"
    @click="handleClick"
  )
    template(v-if="$slots.default")
      slot

    template(#loading v-if="$slots.loading")
      slot(name="loading")

</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  handler: {
    type: Function,
    required: true,
  },
});

const isLoading = ref(false);

const handleClick = async (event) => {
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    await props.handler(event);
  } catch (error) {
    console.error("Erro no AsyncButton handler:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>
