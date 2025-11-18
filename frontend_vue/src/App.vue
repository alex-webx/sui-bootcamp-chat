<template lang="pug">
router-view
</template>

<script setup lang="ts">
import { inject, onMounted } from 'vue';
import * as encrypt2 from './utils/encrypt';

onMounted(async () => {
  // await encrypt2.runTests();
})
</script>
