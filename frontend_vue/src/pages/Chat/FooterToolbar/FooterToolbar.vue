<template lang="pug">
transition(
  appear
  enter-active-class="animated fadeInUp slower"
  leave-active-class="animated fadeOut slower"
)

  q-footer(v-if="!canSendMessage" style="background: rgba(0, 0, 0, 0.1)")
    q-toolbar.flex-center.text-grey-7.text-caption.text-italic
      div Somente leitura: você não possui permissões para enviar mensagens

  q-footer(v-else :class="newMessage.id || newMessage.replyTo ? 'footer-edit-mode' : 'bg-deep-sea'")
    q-form(@submit="sendMessage()" ref="form")

      q-toolbar.text-white.row(v-if="newMessage.id")
        .full-width.q-pl-sm.text-body1 Editar mensagem
        q-btn(icon="close" flat dense @click="clearNewMessage()")

      q-toolbar.flex-center(v-else-if="newMessage.replyTo")
        q-card.q-px-md.q-py-sm.q-mx-md.q-mt-md.q-mb-sm.text-caption(
          style="background: rgba(255, 255, 255, 0.2); border-left: 6px solid rgba(255, 255, 255, 0.4);"
          :style="desktopMode ? 'width: 50%' : 'width: 100%'"
          flat
        )
          .row
            .col
              .text-weight-bold {{ newMessage.replyToMessage.profile?.username }}

          .row
            .col
              .text-italic {{newMessage.replyToMessage.content}}
            .col-auto(v-if="newMessage.replyToMessage.mediaUrl.length")
              video(
                v-if="newMessage.replyToMessage.mediaUrl.length"
                :key="newMessage.replyToMessage.mediaUrl[0]"
                autoplay loop muted playisline
                style="max-height: 100px" :ratio="1"
              )
                source(:src="newMessage.replyToMessage.mediaUrl[0]")

        .absolute-right
          q-btn(icon="close" round flat @click="clearNewMessage()")


      q-toolbar.justify-center.text-white.q-pt-md(v-if="newMessage.mediaUrl?.length")
        .text-white(style="max-width: 30%")
          .flex.row
            .col
              video.fit(autoplay loop muted playisline style="max-height: 50vh")
                source(:src="newMessage.mediaUrl[0]")
            .col-auto
              q-btn(icon="close" flat dense round @click="removeGif()")

      q-toolbar.text-white.row.q-py-xs
        q-btn(icon="mdi-file-gif-box" flat round :disabled="sendingBusy")
          q-menu(ref="tenorMenu")
            q-card.bg-white(style="width: 300px; max-height: 400px")
              TenorComponent(@select="ev => { $refs.tenorMenu.hide(); insertGif(ev) }")

        q-btn(icon="mdi-emoticon-happy-outline" flat round :disabled="sendingBusy")
          q-menu
            EmojiPicker(:native="true" @select="insertEmoji" theme="light")

        q-input.q-ml-sm(
          v-if="!newMessage.id"
          rounded outlined dense class="WAL__field col-grow q-mr-sm"
          v-model="newMessage.content" placeholder="Digite uma mensagem..." type="textarea" rows="1"
          borderless clearable autofocus autogrow @clear="newMessage.content = ''"
          @keydown.enter.exact.prevent="$refs.form.submit($event)"
          :readonly="sendingBusy" :bg-color="sendingBusy ? 'aqua' : 'white'"
        )
        div(v-else-if="newMessage.replyTo")
          | reply
        //--- duplicado apenas para facilitar o autofocus =P
        q-input.q-ml-sm(
          v-else
          rounded outlined dense class="WAL__field col-grow q-mr-sm"
          v-model="newMessage.content" placeholder="Digite uma nova mensagem..." type="textarea" rows="1"
          borderless clearable autofocus autogrow @clear="newMessage.content = ''"
          @keydown.enter.exact.prevent="$refs.form.submit($event)"
          :readonly="sendingBusy" :bg-color="sendingBusy ? 'aqua' : 'white'"
        )

        transition(
          appear
          enter-active-class="animated jello slower"
          leave-active-class="animated fadeOut"
        )
          q-btn(
            flat type="submit"
            :disabled="!newMessage.content.length && newMessage.mediaUrl.length === 0"
            :loading="sendingBusy"
            :round="!newMessage.id" :rounded="!!newMessage.id"
            :label="newMessage.id ? 'Editar' : undefined"
            :icon-right="newMessage.id ? 'send' : undefined"
            :icon="newMessage.id ? undefined : 'send'"
          )

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '../../../stores/chatStore';
import { useUiStore } from '../../../stores';
import { storeToRefs } from 'pinia';

const chatService = useChatStore();
const { desktopMode } = storeToRefs(useUiStore());

const { insertEmoji, insertGif, removeGif, clearNewMessage, canSendMessage } = chatService;
const { newMessage } = chatService;

const sendingBusy = ref(false);
const sendMessage = async () => {
  sendingBusy.value = true;
  try {
    await chatService.sendMessage();
  } finally {
    sendingBusy.value = false;
  }
};
</script>

<style lang="scss" scoped>
.footer-edit-mode {
  box-shadow: 0px 0px 6px 4px $ocean;
  background: $light-ocean;
}
</style>
