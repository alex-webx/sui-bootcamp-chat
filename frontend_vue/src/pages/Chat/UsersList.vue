<template lang="pug">
q-list
  template(v-if="loading")
    q-item(v-for="dummy of 5" :key="'dummy_' + dummy") ;
      q-item-section(avatar)
        q-skeleton(type="QAvatar" size="sm")
      q-item-section
        q-item-label(lines="1")
          q-skeleton
        q-item-label
          q-skeleton

  template(v-else)

    q-item.text-dark(
      v-for="(profile, index) in profiles" :key="index"
      clickable v-ripple
    )
      q-item-section(avatar)
        q-avatar
          img(:src="profile.avatarUrl || '/user-circles-set-sm.png'" error-src="/user-circles-set-sm.png")

      q-item-section
        q-item-label(lines="1")
          | {{ profile.username }}
        q-item-label.conversation__summary(caption)
          | {{ shortAddress(profile.owner) }}

      q-item-section(side)
        q-item-label(caption)
          .text-right
            div
              | entrou em
            div {{ formatDate(profile.createdAt) }}
            div {{ formatTime(profile.createdAt) }}

    .text-center.text-dark.q-px-sm.q-py-xs.text-caption.bg-grey-3
      | {{ profilesLength }} {{profilesLength > 1 ? 'usuários cadastrados' : 'usuário cadastrado'}}
      q-btn.q-ml-sm(icon="mdi-sync" flat dense size="sm" @click="loadUserProfiles()")
        q-tooltip Recarregar lista de usuários

</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsersStore } from '../../stores/usersStore';
import _ from 'lodash';
import moment from 'moment';
import { storeToRefs } from 'pinia';

const usersStore = useUsersStore();
const { profiles } = storeToRefs(usersStore);
const profilesLength = computed(() => Object.keys(profiles.value!).length);
const loading = ref(false);

const formatDate = (date: number) => moment(date).format('DD/MM/YYYY');
const formatTime = (date: number) => moment(date).format('HH[h]mm');
const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const randomColor = (address: string) => {
  let min = 30;
  let max = 225;

  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const range = max - min;

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    const softValue = Math.floor((value / 255) * range) + min;
    color += softValue.toString(16).padStart(2, '0');
  }

  return color;
};

const loadUserProfiles = async () => {
  loading.value = true;
  try {
    await usersStore.fetchAllUsersProfiles();
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadUserProfiles();
});
</script>
