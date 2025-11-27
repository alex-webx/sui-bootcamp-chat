<template lang="pug">
q-drawer.bg-grey-3.text-dark(
  v-if="activeChat"
  :modelValue="activeChat && rightDrawerOpen"
  side="right" :breakpoint="breakpoint" :width="drawerWidth"
  dark elevated
)
  .absolute.q-pa-sm
    q-btn(
      round flat icon="mdi-chevron-right" color="white"
      @click="toggleRighttDrawer()"
    )

  .q-ma-none.flex.flex-center.column.q-py-md.q-gutter-y-sm.card-box.bg-light-ocean.text-white
    q-avatar(size="100px")
      q-img(:src="activeChat.imageUrl || dmUser?.avatarUrl || '/user-circles-set-sm.png'" error-src="/user-circles-set-sm.png" :ratio="1" fit="cover")

    .text-center
      .text-subtitle1 {{ activeChat.name || dmUser?.username }}
      .text-caption {{ activeChat.messageCount }} {{activeChat.messageCount > 1 ? 'mensagens' : 'mensagem' }}

  .q-ma-none.flex.column.q-px-md.q-py-md.q-gutter-y-sm.card-box.text-caption(style="line-height: 11px")
    div Criado em: {{ formatFullDate(activeChat.createdAt) }}
    div(@click="openURL(`https://suiscan.xyz/devnet/object/${activeChat.id}/fields`)") ID do chat: {{ shortenAddress(activeChat.id) }}
    div Tipo: {{ roomTypeToString(activeChat.roomType) }}
    div Convites: {{ permissionToString(activeChat.permissionInvite).join(', ') }}
    div Enviar mensagem: {{ permissionToString(activeChat.permissionSendMessage).join(', ') }}

  .q-ma-none.flex.flex-center.column.q-py-sm.q-gutter-y-sm.card-box
    q-list.full-width
      q-item Membros ({{members.length}})

      q-item(v-for="member in members" :key="member.owner")
        q-item-section(avatar)
          q-avatar
            q-img(:src="member.avatarUrl" :ratio="1" fit="cover")
        q-item-section
          q-item-label {{ member.username }}
          q-item-label(caption) {{ shortenAddress(member.owner) }}
        q-item-section(side)
          q-item-label(v-if="activeChat.owner === member.owner")
            q-chip(size="sm" color="positive" dark)
              | {{ isDM ? 'Criador do chat' : 'Administrador' }}

</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import formatters from '../../../utils/formatters';
import { useChatListStore, useUiStore, useUserStore } from '../../../stores';
import { EPermission, ERoomType, type UserProfile } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';
import { computed, ref, watch } from 'vue';

const chatListStore = useChatListStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const { shortenAddress, formatFullDate } = formatters;
const { breakpoint, drawerWidth, rightDrawerOpen } = storeToRefs(uiStore);

const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };

const { activeChat } = storeToRefs(chatListStore);
const isDM = computed(() => activeChat.value?.roomType === ERoomType.DirectMessage);
const dmUserAddress = computed(() => isDM.value ? _.findKey(activeChat.value?.members, (v, k) => k !== userStore.profile?.owner) : null);
const dmUser = useLiveQuery(() => dmUserAddress.value ? db.profile.get(dmUserAddress.value) : null, [ dmUserAddress ]);

const members = ref<UserProfile[]>([]);

const permissionToString = (permission: EPermission) => {
  const perms: string[] = [];
  if (permission === EPermission.Nobody) { return ['Ninguém']; }
  else if ((permission & EPermission.Anyone) === EPermission.Anyone) { return ['Qualquer um']; }

  if ((permission & EPermission.Members) === EPermission.Members) { perms.push('Membros'); }
  if ((permission & EPermission.Admin) === EPermission.Admin) { perms.push('Administrador'); }
  if ((permission & EPermission.Moderators) === EPermission.Moderators) { perms.push('Moderadores'); }

  return perms;
};

const roomTypeToString = (roomType: ERoomType) => {
  if (roomType === ERoomType.DirectMessage) { return 'Mensagem direta'; }
  else if (roomType === ERoomType.PrivateGroup) { return 'Privado (somente se convidado)'; }
  else if (roomType === ERoomType.PublicGroup) { return 'Público (qualque um)'; }
}

watch(() => activeChat.value?.members, async (newMembers) => {
  members.value = await db.profile.bulkGet(Object.keys(newMembers || {})).then(res => res.map(p => p!));
}, { immediate: true, deep: true });

</script>

<style lang="scss" scoped>
</style>
