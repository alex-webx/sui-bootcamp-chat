<template lang="pug">
.text-grey.q-mx-sm.text-caption.cursor-pointer.flex.items-center(
  v-if="props.address"
  @click="copy()"
)
  | {{ shortenAddress(props.address) }}
  q-icon.q-ml-sm(
    name="mdi-content-copy"
    size="14px"
  )

</template>

<script setup lang="ts">
import formatters from '../utils/formatters';
import { copyToClipboard, Notify } from 'quasar';

const props = defineProps({
  address: {
    type: String,
    required: true
  }
});

const { shortenAddress } = formatters;

const copy = () => {
  copyToClipboard(props.address);
  Notify.create({ message: 'Endereço/ID copiado!', caption: props.address, color: 'medium-sea' });
}

</script>
<style lang="scss" scoped>
</style>
