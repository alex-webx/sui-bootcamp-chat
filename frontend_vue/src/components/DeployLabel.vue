<template lang="pug">
.text-grey.q-mx-sm.text-caption(v-if="githubCommitRef")
  | {{ githubCommitRef }}

</template>

<script setup lang="ts">
import { useConfig } from '../../configs';

const githubCommitRef = useConfig().getConfig('CommitRef')?.substring(0, 7);

</script>
<style lang="scss" scoped>
</style>
