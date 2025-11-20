<template lang="pug">
.flex.q-gutter-x-sm
  q-select(
    hide-dropdown-icon dark
    v-model="network" outlined dense color="white"
    :options="['devnet', 'testnet', 'mainnet']"
    :readonly="props.readonly"
    v-bind="$attrs"
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
import { client, getNetwork, setNetwork } from '../move';
import { Dialog } from 'quasar';
import SettingsMenuDialog from './SettingsMenuDialog.vue';
import { computed, watch, toRef } from 'vue';
import { useAppStore } from '../stores/appStore';
import { useRouter } from 'vue-router';

const props = defineProps({
  readonly: { type: Boolean, default: false },
  showNetwork: { type: Boolean, default: true },
  showSettings: { type: Boolean, default: true }
});

const appStore = useAppStore();
const router = useRouter();

const network = computed({
  get() {
    return getNetwork();
  },
  set(network) {
    setNetwork(network);
    reload();
  }
});

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
