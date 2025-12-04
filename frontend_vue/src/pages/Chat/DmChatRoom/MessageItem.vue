<template lang="pug">
div
  q-menu(context-menu touch-position v-model="isSelected" self="center middle" ref="menu")
    q-list.bg-ocean(dark)
      template(v-if="sent")
        q-item(clickable v-close-popup @click="deleteMessage()" v-if="!message.deletedAt")
          q-item-section(avatar style="min-width: auto")
            q-icon(name="mdi-trash-can-outline")
          q-item-section Excluir
        q-item(clickable v-close-popup @click="startEditMessage()" v-if="!message.deletedAt")
          q-item-section(avatar style="min-width: auto")
            q-icon(name="mdi-pencil-outline")
          q-item-section Editar
      q-item(clickable v-close-popup @click="replyMessage()")
        q-item-section(avatar style="min-width: auto")
          q-icon(name="mdi-reply")
        q-item-section Responder


  q-chat-message(
    :sent="sent"
    :bg-color="bgColor"
    :text-color="textColor"
    :class="{ 'is-first': isFirst, 'is-last': isLast }"
    :id="'message_' + message.messageNumber"
    @contextmenu.prevent="() => isSelected = true"
    @dblclick="() => isSelected = true"
  )
    template(#name v-if="isFirst")
      span.text-weight-bold(:class="sent ? 'text-ocean' : 'text-medium-sea'")
        | {{ user.username }}

    template(#avatar)
      q-avatar.q-mx-md
        q-img(v-if="isLast" :src="user.avatarUrl || './logo.png'" :ratio="1" fit="cover")

    template(#stamp)
      .flex.items-center
        q-icon(name="mdi-lock")
          q-tooltip
            div Mensagem criptografada E2EE utilizando
            div uma chave AES derivada de ECDH das duas partes
        span
          q-badge(:color="bgColor" :text-color="textColor") {{ stamp(message.createdAt) }}
            q-tooltip {{ formatFullDate(message.createdAt) }}
        q-space
        q-badge(v-if="message.editedAt" label="editada" dense flat no-caps :color="bgColor" :text-color="textColor")
          q-tooltip Editada em {{ formatFullDate(message.editedAt) }}
        q-btn(icon="mdi-pound" dense size="xs" flat @click="exploreObject()")
          q-tooltip Verificar mensagem no Suiscan


    .text-italic.text-caption.q-py-sm.q-px-md.rounded-borders.deleted-message(
      v-if="message.deletedAt"
    )
      | mensagem removida
      q-tooltip Removida em {{ formatFullDate(message.deletedAd) }}


    .text-body1(v-else)

      .rounded-borders.q-ma-xs.q-px-sm.q-py-xs.text-caption.cursor-pointer.text-left(
        v-if="replyingTo"
        style="background: rgba(255, 255, 255, 0.13); border-left: 4px solid rgba(255, 255, 255, 0.3)"
        @click="scrollToReplyMessage()"
      )
        .text-weight-bold {{replyingToDecrypted.profile?.username}}
        .text-italic {{replyingToDecrypted.content}}
        template(v-if="replyingToDecrypted.mediaUrl?.length")
          img(
            v-if="replyingToDecrypted.mediaUrl[0].startsWith('blob:')"
            :src="replyingToDecrypted.mediaUrl[0]"
            style="max-width: 80px; max-height: 80px"
          )
          video.fit(
            v-else
            :key="replyingToDecrypted.mediaUrl[0]"
            autoplay loop muted playisline
            style="max-width: 80px; max-height: 80px"
          )
            source(:src="replyingToDecrypted.mediaUrl[0]")
        .text-italic(v-if="replyingTo.deletedAt") mensagem removida

      template(v-if="mediaUrl.length")
        img(
          v-if="mediaUrl[0].startsWith('blob:')"
          :src="mediaUrl[0]"
          style="max-width: 350px; max-height: 300px"
        )
        video.fit(
          v-else
          :key="mediaUrl[0]"
          autoplay loop muted playisline
          style="max-width: 350px; max-height: 300px"
        )
          source(:src="mediaUrl[0]")


      .q-px-sm(v-for="(line, iLine) in content.split('\\n')" :key="'line_' + iLine" :class="sent ? 'text-right' : 'text-left'")
        | {{ line }}

</template>
<script setup lang="ts">
import { computed, watchEffect, ref, toRefs, type PropType } from 'vue';
import _ from 'lodash';
import { openURL, QMenu } from 'quasar';
import { useChatStore } from '../../../stores/chatStore';
import { formatFullDate, stamp } from '../../../utils/formatters';
import { type Message, type UserProfile, getNetwork } from '../../../move';
import { db, useLiveQuery } from '../../../utils/dexie';

const props = defineProps({
  message: {
    type: Object as PropType<Message>,
    required: true
  },
  sent: {
    type: Boolean,
    requireD: true
  },
  user: {
    type: Object as PropType<UserProfile>,
    required: true
  },
  isFirst: {
    type: Boolean
  },
  isLast: {
    type: Boolean
  },
  decryptMessage: {
    type: Function,
    required: true
  }
});

const { message, user, sent, isFirst, isLast } = toRefs(props);
const chatStore = useChatStore();
const isSelected = ref(false);
const bgColor = computed(() => sent.value ? 'primary' : 'white');
const textColor = computed(() => sent.value ? 'white' : 'dark');
const menu = ref<InstanceType<typeof QMenu>>();

const content = ref('');
const mediaUrl = ref<string[]>([]);

const overwrites = useLiveQuery(() => message.value.editedAt ? db.message.where('previousVersionId').equals(message.value.id).sortBy('createdAt').then(ms => ms.slice(-1)?.[0]) : null, [ message ]);

const replyingTo = useLiveQuery(() => message.value.replyTo ? db.message.get(message.value.replyTo) : null, [ message ]);
const replyingToDecrypted = ref<Pick<Message, 'content' | 'mediaUrl'> & { profile?: UserProfile }>();


watchEffect(async () => {
  const decrypted = await props.decryptMessage(overwrites.value || message.value);
  content.value = decrypted.content;
  mediaUrl.value = decrypted.mediaUrl;
});

watchEffect(async () => {
  if (replyingTo.value) {
    const decrypted = await props.decryptMessage(replyingTo.value);
    replyingToDecrypted.value = {
      content: decrypted.content,
      mediaUrl: decrypted.mediaUrl,
      profile: (await db.profile.get(replyingTo.value.sender))!
    };
  } else {
    replyingToDecrypted.value = {
      content: '',
      mediaUrl: []
    };
  }
});


const exploreObject = () => {
  openURL(`https://suiscan.xyz/${getNetwork()}/object/${message.value.id}/fields`);
};

const deleteMessage = async () => {
  try {
    await chatStore.deleteMessage(message.value);
  } finally {
    isSelected.value = false;
  }
};

const startEditMessage = async () => {
  isSelected.value = false;
  chatStore.newMessage = {
    id: message.value.id,
    content: content.value || '',
    mediaUrl: mediaUrl.value || [],
    replyTo: message.value.replyTo || ''
  };
};

const replyMessage = async () => {
  isSelected.value = false;
  chatStore.newMessage = {
    id: '',
    content: '',
    mediaUrl: [],
    replyTo: message.value.id,
    replyToMessage: {
      ...message.value,
      content: content.value,
      mediaUrl: mediaUrl.value,
      profile: (await db.profile.get(message.value.sender))!
    }
  };
};

const scrollToReplyMessage = async () => {
  const el = document.getElementById('message_' + replyingTo.value?.messageNumber);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

</script>
<style lang="scss" scoped>
:deep(.q-message-text--sent .deleted-message) {
  background: rgba(black, 0.05);
  color: rgba(white, 0.8)
}

:deep(.q-message-text:last-child:before) {
  border: none;
}

.is-last :deep(.q-message-text--sent:last-child:before) {
  border-left: 0 solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid currentColor;
}

:deep(.q-message-text--received .deleted-message) {
  background: rgba(0,0,0, 0.05);
}

:deep(.q-message-text:last-child:before) {
  border: none;
}

.is-last :deep(.q-message-text--received:last-child:before) {
  border-right: 0 solid transparent;
  border-left: 8px solid transparent;
  border-bottom: 8px solid currentColor;
}
</style>
