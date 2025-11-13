<template lang="pug">
.text-grey.q-mx-sm.text-caption
  | {{ githubCommitRef }}

</template>

<script setup lang="ts">
import { getAllConstants } from '../constants';

const githubCommitRef = getAllConstants().VUE_APP_GITHUB_COMMIT_REF;

</script>
<style lang="scss" scoped>
</style>
