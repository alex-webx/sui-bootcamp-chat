<template lang="pug">
router-view
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import * as encrypt2 from './utils/encrypt2';

onMounted(async () => {
  // await encrypt2.UserProfileGenerator.example();
  // await encrypt2.DirectMessageService.example();
  // await encrypt2.UserProfileService.example();
  // await encrypt2.PublicChannelService.example();
  // await encrypt2.PrivateGroupService.example();

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

  console.log('fim');

})
</script>
