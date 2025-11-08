<template lang="pug">
q-list
  q-item.bg-blue-grey-8
    q-item-section(avatar)
      q-avatar(color="blue-grey" text-color="white" icon="bluetooth")
    q-item-section
      ConnectButton

  q-separator

  template(v-for="(chat, iChat) in chats" :key="iChat")
    q-separator(v-if="iChat > 0")
    q-item
      q-item-section(avatar)
        q-avatar(color="blue-grey" text-color="white" icon="bluetooth")
      q-item-section
        | {{ chat }}
        q-item-label(caption) ok
      q-item-section(side top)
        .flex.flex-center.column
          .text-blue-grey(style="font-size:10px") 13:14
          div
            q-badge(rounded style="font-size:10px") 232
    

  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserProfileStore } from '../stores/userProfileStore';
import ConnectButton from '../components/ConnectButton.vue';

const chats = new Array(20).fill(1).map(i => 'Chat');

</script>
