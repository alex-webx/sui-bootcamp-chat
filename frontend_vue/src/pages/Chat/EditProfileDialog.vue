<template lang="pug">
q-dialog(ref="dialogRef" @hide="onDialogHide")
  q-card.q-dialog-plugin
    q-form(@submit="submit()" ref="myForm")
      q-card-section.q-dialog__title
        | Editar Perfil

      q-card-section.q-dialog__message

        .colum.q-gutter-y-md
          .col.text-caption.text-grey
            .flex
              | Profile ID
              AddressLabel(:address="profile.id")
          .col
            q-input(
              label="Nome de usuário *" outlined maxlength="50" stack-label
              v-model="form.username" :max="50" :maxlength="50" hide-bottom-space
              :rules=`[
                val => val.length < 50 || 'Máximo de 50 caracteres',
                val => val.length || '* Campo obrigatório'
              ]`
            )
          .col
            q-input(
              label="Avatar (URL ou data:image)" outlined stack-label
              v-model="form.avatarUrl"
            )
              template(#after v-if="form.avatarUrl")
                q-avatar(size="50px")
                  q-img(:src="form.avatarUrl" :ratio="1" fit="cover" error-src="/user-circles-set.png")

      .q-card__actions.justify-end.q-card__actions--horiz.row
        q-btn(
          label="Cancelar"
          flat @click="onDialogHide"
        )
        q-btn(
          label="Salvar"
          type="submit"
          color="primary"
        )

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Loading, QForm, useDialogPluginComponent } from 'quasar';
import { storeToRefs } from 'pinia';
import { useWalletStore } from '../../stores/walletStore';
import { useUserStore } from '../../stores/userStore';
import AddressLabel from '../../components/AddressLabel.vue';

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const userStore = useUserStore();
const { profile } = storeToRefs(userStore);

const form = ref({ username: '', avatarUrl: '' });
const myForm = ref<InstanceType<typeof QForm>>();

const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();

onMounted(() => {
  form.value = {
    avatarUrl: profile.value?.avatarUrl || '',
    username: profile.value?.username || ''
  };
});

const submit = async () => {
  if (myForm.value?.validate(true)) {
    onDialogOK(form.value);
  }
}

</script>
