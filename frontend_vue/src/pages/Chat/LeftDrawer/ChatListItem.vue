<template lang="pug">
q-item(
  clickable v-ripple
  @click="selectChat()"
  :class="{ 'active-item': room.id === activeChatId }"
)
  q-item-section(avatar)
    q-avatar(size="48px")
      q-img(:src="image" :ratio="1" fit="cover")

  q-item-section
    q-item-label(lines="1")
      .flex.items-center
        div {{ room.name || dmUser?.username }}

        div(caption lines="1" v-if="!youJoined")
          q-icon.q-mb-xs.q-ml-xs(name="mdi-alert-circle" color="sea" size="16px")
            q-tooltip Você ainda não entrou na sala

    q-item-label.text-italic(v-if="lastMessage" caption lines="2")
      | {{ lastMessageUser?.username }}:
      | {{ lastMessage.deletedAt ? 'mensagem removida' : lastMessageContent }}
      template(v-if="lastMessage.mediaUrl?.length")
        span.q-mx-xs imagem
        q-icon( name="mdi-image-outline")


  q-item-section(side)
    q-item-label(caption v-if="lastMessage && !isToday(lastMessage.createdAt)")
      div {{ formatDate(lastMessage.createdAt) }}
    q-item-label(caption v-if="lastMessage")
      div {{ formatTime(lastMessage.createdAt) }}

</template>
<script setup lang="ts">
import { computed, ref, watchEffect, type PropType } from 'vue';
import _ from 'lodash';
import moment from 'moment';
import { useUserStore } from '../../../stores';
import { formatDate, formatTime } from '../../../utils/formatters';
import { type ChatRoom, type MemberInfo, ERoomType } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';
import * as encrypt from '../../../utils/encrypt';
import { useChatListStore } from '../../../stores';
import { storeToRefs } from 'pinia';

const props = defineProps({
  room: {
    type: Object as PropType<ChatRoom>,
    required: true
  }
});

const { room } = props;

const userStore = useUserStore();
const chatStore = useChatListStore();

const { activeChatId } = storeToRefs(chatStore);

const address = computed(() => userStore.profile?.owner!);
const isDM = computed(() => room.roomType === ERoomType.DirectMessage);
const dmUserAddress = computed(() => { if (isDM.value) { return _.findKey(room.members, (v, k) => k !== address.value); } });
const dmUser = useLiveQuery(() => dmUserAddress.value ? db.profile.get(dmUserAddress.value!) : null, [ dmUserAddress ]);

const image = computed(() => (isDM.value ? dmUser.value?.avatarUrl : room.imageUrl) || '/user-circles-set.png');
const youJoined = computed(() => (userStore.profile?.roomsJoined || []).indexOf(props.room.id) >= 0);
const dmUserJoined = computed(() => (dmUser.value?.roomsJoined || []).indexOf(props.room.id) >= 0);
const lastMessage = useLiveQuery(() => db.message.where('roomId').equals(room.id).sortBy('createdAt').then(m => m.slice(-1)[0]));
const lastMessageUser = useLiveQuery(() => lastMessage.value?.sender ? db.profile.get(lastMessage.value.sender) : null, [lastMessage]);
const isToday = (timestamp: number) => moment(Number(timestamp)).isSame(moment(), 'date');
const memberInfo = computed(() => room.members[address.value] as MemberInfo);

const decryptService = computed(() => {
  if (room.roomType === ERoomType.DirectMessage) {
    const svc = new encrypt.DirectMessageService(userStore.profile?.keyPrivDecoded!, dmUser.value?.keyPub!);
    return svc;
  } else if (props.room.roomType === ERoomType.PrivateGroup) {
    const svc = new encrypt.PrivateGroupService({
      encodedAesKey: memberInfo.value?.roomKey?.encodedPrivKey!,
      iv: memberInfo.value?.roomKey?.iv!,
      inviterPublicKey: memberInfo.value?.roomKey?.pubKey!
    }, userStore.profile?.keyPrivDecoded!);
    return svc;
  } else if (props.room.roomType == ERoomType.PublicGroup) {
    const svc = new encrypt.PublicChannelService(props.room.owner);
    return svc;
  }
});

const selectChat = async () => {
  chatStore.activeChatId = chatStore.activeChatId === props.room.id ? '' : props.room.id;
}

const lastMessageContent = ref('');

watchEffect(async () => {
  let content = lastMessage.value?.content;

  if (content) {
    try {
      const obj = JSON.parse(content) as [ iv: string, ciphertext: string ];
      content = await decryptService.value!.decryptMessage({ iv: obj[0], ciphertext: obj[1] });
    } catch {}

    lastMessageContent.value = content;
  }
});

</script>
<style lang="scss" scoped>
.active-item {
  background-color: rgba($sea, 0.2);
}
</style>
