<template lang="pug">
.flex.q-gutter-x-sm
  q-select(
    borderless hide-dropdown-icon dark
    v-model="network" outlined dense color="white"
    :options="['devnet', 'testnet', 'mainnet']"
    @update:modelValue="reload()"
    :readonly="props.readonly"
    v-if="props.showNetwork"
  )
    template(#selected-item)
      span.text-white.text-weight-bold {{ network.toUpperCase() }}

  q-btn(
    v-if="props.showSettings" color="white"
    icon="mdi-cog" flat round
    @click="configureSettings()"
  )

</template>

<script setup lang="ts">
import { useSuiClientStore } from '../stores/suiClientStore';
import { Dialog } from 'quasar';
import SettingsMenuDialog from './SettingsMenuDialog.vue';
import { storeToRefs } from 'pinia';

const props = defineProps({
  readonly: { type: Boolean, default: false },
  showNetwork: { type: Boolean, default: true },
  showSettings: { type: Boolean, default: true }
});

const suiClientStore = useSuiClientStore();

const { network } = storeToRefs(suiClientStore);

const configureSettings = () => {
  Dialog.create({
    component: SettingsMenuDialog
  }).onOk(() => {
    reload();
  })
}

const reload = () => window.location.reload();

</script>
<style lang="scss" scoped>
</style>
