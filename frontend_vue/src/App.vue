<template lang="pug">
router-view
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import * as encrypt2 from './utils/encrypt';

onMounted(async () => {
  // await encrypt2.runTests();

  // const ecdh = await window.crypto.subtle.generateKey(
  //   { name: "ECDH", namedCurve: "P-256" },
  //   true,
  //   ["deriveKey"]
  // );
  // const pubKey = await window.crypto.subtle.exportKey("spki", ecdh.publicKey);

  // const importedPubKey = await window.crypto.subtle.importKey(
  //   "spki",
  //   pubKey, // Usa o buffer do Uint8Array
  //   { name: "ECDH", namedCurve: "P-256" },
  //   true,
  //   []
  // );

})
</script>
