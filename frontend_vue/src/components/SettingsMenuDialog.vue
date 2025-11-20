<template lang="pug">
q-dialog(ref="dialogRef" @hide="onDialogHide" full-width)
  q-card.q-dialog-plugin
    q-form(@submit="submit()" ref="myForm")
      q-card-section.q-dialog__title
        | Configurações de ambiente

      q-card-section.q-dialog__message

        .row
          .col-xs-12(v-for="(configValue, key) of form")
            q-input(
              :model-value="configValue"
              @update:modelValue="val => form[key] = val"
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
import { onMounted, ref } from 'vue';
import { Loading, QForm, useDialogPluginComponent } from 'quasar';
import { useConfig } from '../../configs';

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});
const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();

const config = useConfig();

const myForm = ref<InstanceType<typeof QForm>>();
let original = config.getAllNetworkConfigs();
const form = ref<ReturnType<typeof config.getAllNetworkConfigs>>(config.getAllNetworkConfigs());

const submit = async () => {
  if (myForm.value?.validate(true)) {
    Object.keys(form.value).map((key) => {
      const k = key as keyof typeof original;
      const value = form.value[k];
      if (value !== original[k]) {
        config.setNetworkConfig(k, value);
      }
    });
    onDialogOK();
  }
}

const resetToDefault = () => {
  config.resetAllNetworkConfigs();
  onDialogOK();
};

onMounted(() => {
})

</script>
