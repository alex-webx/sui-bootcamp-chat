<template lang="pug">
.text-grey.q-mx-sm.text-caption(v-if="githubCommitRef")
  | {{ githubCommitRef }}

</template>

<script setup lang="ts">
import { getAllConfigs } from '../../configs';

const githubCommitRef = getAllConfigs().COMMIT_REF?.substring(0, 7);

</script>
<style lang="scss" scoped>
</style>
