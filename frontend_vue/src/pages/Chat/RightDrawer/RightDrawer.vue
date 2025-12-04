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
    div Capacidade máxima de membros: {{activeChat.maxMembers || 'ilimitada' }}

  .q-ma-none.flex.flex-center.column.q-py-sm.q-gutter-y-sm.card-box

    q-list.full-width

      q-item Membros ({{members.length}})

      q-item(
        v-for="member in members" :key="member.owner"
        :class=`isDM ? {} : {
          'bg-member': true,
          'bg-admin': activeChat.owner === member.owner,
          'bg-moderator': !!activeChat.moderators[member.owner],
          'bg-banned': !!activeChat.bannedUsers[member.owner]
        }`
      )

        q-item-section(avatar)
          q-avatar
            q-img(:src="member.avatarUrl" :ratio="1" fit="cover")

        q-item-section
          q-item-label.ellipsis {{ member.username }}

          q-item-label(caption)
            | {{ member.owner === profile.owner ? 'você' : shortenAddress(member.owner) }}

        template(v-if="!isDM")

          q-item-section(side)
            q-item-label(v-if="activeChat.owner === member.owner")
              q-chip(size="sm" color="green-7" dark) ADM
            q-item-label(v-else-if="!!activeChat.moderators[member.owner]")
              q-chip(size="sm" color="sea" dark) MOD
            q-item-label(v-if="!!activeChat.bannedUsers[member.owner]")
              q-chip(size="sm" color="red" outline dark) BAN

          q-item-section(side v-if="canBanUnban || canManagerModerators || canSilenceUsers")
            q-btn(v-if="member.owner === profile.owner || member.owner === activeChat.owner" flat round dense readonly)
            q-btn(v-else icon="mdi-dots-vertical" flat round dense)
              q-menu(@before-show="timestampControls.startLoop()" @before-hide="timestampControls.stopLoop()")
                q-list.bg-ocean(dark)

                  template(v-if="canManagerModerators")

                    q-item(v-if="!activeChat.moderators[member.owner]" clickable @click="manageModerator(member, 'add')" v-close-popup)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-tie")
                      q-item-section Tornar Moderador

                    q-item(v-else clickable @click="manageModerator(member, 'remove')" v-close-popup)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-tie")
                      q-item-section Remover cargo de Moderador

                  template(v-if="canBanUnban")

                    q-item(v-if="!activeChat.bannedUsers[member.owner]" clickable @click="manageBan(member, 'ban')" v-close-popup)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-off-outline")
                      q-item-section Banir usuário

                    q-item(v-else clickable @click="manageBan(member, 'unban')" v-close-popup)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-outline")
                      q-item-section Desbanir usuário

                  template(v-if="canSilenceUsers")
                    q-item(v-if="activeChat.mutedUsers[member.owner] == null || (activeChat.mutedUsers[member.owner] !== 0 && activeChat.mutedUsers[member.owner] < timestamp)" clickable)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-clock-outline")
                      q-item-section Silenciar usuário
                      q-item-section(side)
                        q-icon(name="keyboard_arrow_right")

                      q-menu(anchor="top end" self="top start")
                        q-list.bg-ocean(dark)
                          template(v-for="[muteFor, label]  in muteForOptions")
                            q-item(clickable @click="manageMute(member, muteFor, label)" v-close-popup)
                              q-item-section Silenciar por {{label}}

                    q-item(v-else clickable @click="manageMute(member, null)" v-close-popup)
                      q-item-section(avatar style="min-width: auto")
                        q-icon(name="mdi-account-clock-outline")
                      q-item-section
                        q-item-label Remover silenciamento
                        q-item-label(caption)
                          | {{ activeChat.mutedUsers[member.owner] === 0 ? 'duração indeterminada' : duration(activeChat.mutedUsers[member.owner]) }}


</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import moment from 'moment';
import { Notify, openURL } from 'quasar';
import formatters from '../../../utils/formatters';
import { useChatStore, useUiStore, useUserStore } from '../../../stores';
import { getCurrentTimestampMs, EPermission, ERoomType, type UserProfile } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';
import { computed, ref, watch } from 'vue';
import { useAsyncLoopWithLifecycle } from '../../../utils/useAsyncLoop';

const timestamp = ref(0);
const timestampControls = useAsyncLoopWithLifecycle(async () => {
  timestamp.value = +await getCurrentTimestampMs();
}, 1000, { executeImmediately: false });

const muteForOptions = [
  [1, '1 minuto' ],
  [5, '5 minutos'],
  [15, '15 minutos' ],
  [60, '1 hora' ],
  [12 * 60, '12 horas' ],
  [24 * 60, '1 dia' ],
  [7 * 24 * 60, '1 semana' ],
  [30 * 24 * 60, '30 dias' ],
  [0, 'tempo indeterminado' ],
];

const duration = (ts: number | string) => {
  const diff = moment(typeof ts === 'string' ? +ts : ts).diff(moment(timestamp.value));
  return moment.duration(diff).format('D[d] HH:mm:ss', { trim: 'large' });
};

const chatStore = useChatStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const { shortenAddress, formatFullDate } = formatters;
const { breakpoint, drawerWidth, rightDrawerOpen } = storeToRefs(uiStore);

const toggleRighttDrawer = () => { rightDrawerOpen.value = !rightDrawerOpen.value; };

const { profile } = storeToRefs(userStore);
const { activeChat, canBanUnban, canManagerModerators, canSendMessage, canSilenceUsers } = storeToRefs(chatStore);
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

const manageMute = async (user: UserProfile, muteFor: number | null, label?: string) => {
    const notif = Notify.create({
    message: muteFor == null ? 'Removendo silenciamento do usuário' : 'Silenciando o usuário',
    caption: muteFor == null ? '' : (muteFor === 0 ? 'Duração indeterminada' : `Duração: ${label}`),
    color: 'deep-sea',
    group: false,
    timeout: 0,
    spinner: true
  });

   try {
    await chatStore.manageMuteUser(user, muteFor ? (muteFor * 60 * 1000) : muteFor);
    notif({
      message: 'Configurações de silenciamento atualizadas!',
      color: 'positive',
      icon: 'done',
      timeout: 2500,
      spinner: false
    });
  } catch (err) {
    console.log(err);
    notif({
      message: 'Silenciamento não atualizado!',
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
.bg-member {
  background: rgba(white, 1);
}
.bg-admin {
  background: rgba($green, 0.1);
}
.bg-moderator {
  background: rgba($blue, 0.1);
}
.bg-banned {
  background: white;
  :deep(img) {
    filter: grayscale(1);
  }
}
</style>
