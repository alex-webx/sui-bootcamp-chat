<template lang="pug">
q-dialog(ref="dialogRef" @hide="onDialogHide")
  q-card.q-dialog-plugin
    q-form(@submit="submit()" ref="myForm")
      q-card-section.q-dialog__title
        | Criar nova sala

      q-card-section.q-dialog__message

        .row
          .col-xs-12
            q-input(
              v-model="newChatRoom.name"
              label="Nome da sala (5-30 caracteres) *"
              type="text" :min="5" :minlength="5" :max="30" :maxlength="30"
              outlined stack-label
              :rules=`[
                val => val.length >= 5 || 'Mínimo de 5 caracteres',
                val => val.length <= 30 || 'Máximo de 30 caracteres',
                val => val.length || '* Campo obrigatório'
              ]`
            )
          .col-xs-12
            q-input(
              v-model="newChatRoom.imageUrl"
              label="Imagem da sala (URL ou data:image)" outlined stack-label type="text"
            )
              template(#after)
                q-avatar
                  q-img(:src="newChatRoom.imageUrl")

      .q-card__actions.justify-end.q-card__actions--horiz.row
        q-btn(
          label="Cancelar"
          flat @click="onDialogHide"
        )
        q-btn(
          label="Criar sala"
          type="submit"
          color="primary"
        )

</template>
<script setup lang="ts">
import { defineEmits, ref } from 'vue';
import { Loading, QForm, useDialogPluginComponent } from 'quasar';
import { useChatRoomStore } from '../../stores/chatRoomStore';

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const chatRoomStore = useChatRoomStore();

const newChatRoom = ref<Parameters<typeof chatRoomStore.createChatRoom>[0]>({ name: '', imageUrl: '' });
const myForm = ref<InstanceType<typeof QForm>>();

const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();

const submit = async () => {
  if (myForm.value?.validate(true)) {
    onDialogOK(newChatRoom.value);
  }
}

</script>
