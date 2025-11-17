<template lang="pug">
q-item-section(avatar)
  q-avatar
    q-img(:src="props.room.imageUrl || '/logo_sui_chat.png'" :ratio="1" fit="cover")

q-item-section
  q-item-label(lines="1") {{ props.room.name }}
  q-item-label(caption)
    | {{ props.room.roomType }}

q-item-section(side)
  q-item-label(caption)
    | [todo: horário]
  q-badge()
    | [todo]

</template>
<script setup lang="ts">
import { ref, onMounted, computed, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { type UserProfile, type ChatRoom } from '../../move';

const props = defineProps({
  userAddress: {
    type: String,
    required: true
  },
  users: {
    type: Object as PropType<Record<string, UserProfile>>,
    required: true
  },
  room: {
    type: Object as PropType<ChatRoom>,
    required: true
  }
})

const contactedParticipantId = computed(() => {
  return Object.keys(props.room.participants).find(id => id !== props.userAddress)!;
});

const contactedUser = computed(() => {
  return props.users[contactedParticipantId.value];
});

</script>
<style lang="scss" scoped>
</style>
