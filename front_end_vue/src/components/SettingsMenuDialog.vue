<template lang="pug">
q-dialog(ref="dialogRef" @hide="onDialogHide" full-width)
  q-card.q-dialog-plugin
    q-form(@submit="submit()" ref="myForm")
      q-card-section.q-dialog__title
        | Configurações de ambiente

      q-card-section.q-dialog__message

        .row
          .col-xs-12(v-for="(constant, key) of constants")
            q-input(
              :model-value="constant"
              @update:modelValue="val => constants[key] = val"
              :label="key + ' *'"
              type="text" outlined stack-label
              :rules=`[
                val => val.length || '* Campo obrigatório'
              ]`
            )


      .q-card__actions.justify-end.q-card__actions--horiz.row
        q-btn(
          label="Cancelar"
          flat @click="onDialogHide()"
        )
        q-btn(
          label="Resetar para padrão" @click="resetToDefault()"
          outline color="primary"
        )
        q-btn(
          label="Salvar"
          type="submit" color="primary"
        )

</template>
<script setup lang="ts">
import { defineEmits, onMounted, ref } from 'vue';
import { Loading, QForm, useDialogPluginComponent } from 'quasar';
import { getAllConstants, resetAllConstants, setConstant } from '../constants';

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const myForm = ref<InstanceType<typeof QForm>>();
let original = getAllConstants();
const constants = ref<ReturnType<typeof getAllConstants>>(getAllConstants());

const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();

const submit = async () => {
  if (myForm.value?.validate(true)) {
    Object.keys(constants.value).map((key) => {
      const k = key as keyof typeof original;
      const value = constants.value[k];
      if (value !== original[k]) {
        setConstant(k, value);
      }
    });
    onDialogOK();
  }
}

const resetToDefault = () => {
  resetAllConstants();
  onDialogOK();
};

onMounted(() => {
})

</script>
