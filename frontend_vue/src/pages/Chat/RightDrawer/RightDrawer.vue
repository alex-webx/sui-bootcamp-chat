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
    div.cursor-pointer(@click="openURL(`https://suiscan.xyz/devnet/object/${activeChat.id}/fields`)")
      | ID do chat: {{ shortenAddress(activeChat.id) }}
      q-icon.q-ml-xs(name="mdi-open-in-new")
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
          q-item-label.ellipsis {{ member.username }}

          q-item-label(caption)
            | {{ member.owner === profile.owner ? 'você' : shortenAddress(member.owner) }}

        q-item-section(side)
          q-item-label(v-if="!isDM && activeChat.owner === member.owner")
            q-chip(size="sm" color="green-7" dark) ADM
          q-item-label(v-else-if="!!activeChat.moderators[member.owner]")
            q-chip(size="sm" color="blue" dark) MOD
          q-item-label(v-if="!!activeChat.bannedUsers[member.owner]")
            q-chip(size="sm" color="red" outline dark) BAN

        q-item-section(side)
          q-btn(v-if="member.owner === profile.owner" flat round dense readonly)
          q-btn(v-else icon="mdi-dots-vertical" flat round dense)
            q-menu(auto-close)
              q-list.bg-ocean(dark)

                template(v-if="canManagerModerators")

                  q-item(v-if="!activeChat.moderators[member.owner]" clickable @click="manageModerator(member, 'add')")
                    q-item-section(avatar style="min-width: auto")
                      q-icon(name="mdi-account-tie")
                    q-item-section Tornar Moderador

                  q-item(v-else clickable @click="manageModerator(member, 'remove')")
                    q-item-section(avatar style="min-width: auto")
                      q-icon(name="mdi-account-tie")
                    q-item-section Remover cargo de Moderador

                template(v-if="canBanUnban")

                  q-item(v-if="!activeChat.bannedUsers[member.owner]" clickable @click="manageBan(member, 'ban')")
                    q-item-section(avatar style="min-width: auto")
                      q-icon(name="mdi-account-off-outline")
                    q-item-section Banir usuário

                  q-item(v-else clickable @click="manageBan(member, 'unban')")
                    q-item-section(avatar style="min-width: auto")
                      q-icon(name="mdi-account-outline")
                    q-item-section Desbanir usuário


</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import { Notify, openURL } from 'quasar';
import formatters from '../../../utils/formatters';
import { useChatStore, useUiStore, useUserStore } from '../../../stores';
import { EPermission, ERoomType, type UserProfile } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';
import { computed, ref, watch } from 'vue';

const chatStore = useChatStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const { shortenAddress, formatFullDate } = formatters;
const { breakpoint, drawerWidth, rightDrawerOpen } = storeToRefs(uiStore);

const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };

const { profile } = storeToRefs(userStore);
const { activeChat, canBanUnban, canManagerModerators, canSendMessage } = storeToRefs(chatStore);
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

const manageModerator = async (user: UserProfile, action: 'add' | 'remove') => {
  const notif = Notify.create({
    message: action === 'add' ? 'Promovendo usuário a Moderador' : 'Removendo permissões de Moderador',
    color: 'deep-sea',
    group: false,
    timeout: 0,
    spinner: true
  });

  try {

    await chatStore.addRemoveModerator(user, action);
    notif({
      message: 'Cargo atualizado!',
      color: 'positive',
      icon: 'done',
      timeout: 2500,
      spinner: false
    });
  } catch {
    notif({
      message: 'Cargo não atualizado!',
      color: 'negative',
      timeout: 2500,
      spinner: false
    });
  }
};

const manageBan = async (user: UserProfile, action: 'ban' | 'unban') => {
    const notif = Notify.create({
    message: action === 'ban' ? 'Banindo usuário' : 'Desbanindo usuário',
    color: 'deep-sea',
    group: false,
    timeout: 0,
    spinner: true
  });

   try {
    await chatStore.banUnbanUser(user, action);

    notif({
      message: 'Permissões atualizadas!',
      color: 'positive',
      icon: 'done',
      timeout: 2500,
      spinner: false
    });
  } catch {
    notif({
      message: 'Banimento não atualizado!',
      color: 'negative',
      timeout: 2500,
      spinner: false
    });
  }
};


watch(() => activeChat.value?.members, async (newMembers) => {
  const users = await db.profile.bulkGet(Object.keys(newMembers || {})).then(res => res.map(p => p!));
  const room = activeChat.value!;
  members.value = _(users).orderBy(user => [ room?.owner === user.owner ? 0 : 1, room.moderators[user.owner] ? 0 : 1, !room.bannedUsers[user.owner] ? 0 : 1 ]).value();

}, { immediate: true, deep: true });

</script>

<style lang="scss" scoped>
</style>
