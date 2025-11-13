<template lang="pug">
.text-grey.q-mx-sm.text-caption
  | {{ githubCommitRef }}

</template>

<script setup lang="ts">
import { getAllConstants } from '../constants';

const githubCommitRef = getAllConstants().COMMIT_REF?.substring(0, 7);

</script>
<style lang="scss" scoped>
</style>
