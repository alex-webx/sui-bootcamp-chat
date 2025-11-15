<template lang="pug">

.q-pa-xs
  q-input(
    v-model="searchText" @keypress.enter="searchTenor()" outlined bg-color="white" color="grey"
    placeholder="Search Tenor" stack-label dense clearable size="sm" :debounce="800" autofocus
  )

.q-ma-xs(v-bind="$attrs")
  .row
    .col-xs-6(v-for="item in results" :key="item.id" style="min-height: 100px")
      video.cursor-pointer.fit(autoplay loop muted playisline @click="select(item)")
        source(:src="item.media_formats.nanomp4.url")

.flex.flex-center.q-pt-md.q-px-xs.q-pb-xs(v-if="cursor")
  q-btn.full-width(
    dense flat color="medium-sea" size="md" no-caps
    @click="showMore()"
  )
    | ver mais
    q-icon(name="mdi-chevron-double-down" right size="xs")


</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { searchGif, type TenorResult } from '../utils/tenor';
export type { TenorResult };

const props = defineProps({
  columns: {
    type: Number,
    default: 2
  }
});

const emits = defineEmits<{
  (e: 'select', result: TenorResult): void;
}>();

const searchText = ref('');
const results = ref<TenorResult[]>([]);
const cursor = ref('');
const pageSize = 40;

watch(searchText, () => {
  searchTenor()
});

const searchTenor = async () => {
  const page = await searchGif(searchText.value, pageSize);
  results.value = page.results;
  cursor.value = page.next;
};

const showMore = async () => {
  const page = await searchGif(searchText.value, pageSize, cursor.value);
  results.value = [ ... results.value, ...page.results ];
  cursor.value = page.next;
}

const select = async (result: TenorResult) => {
  emits('select', result);
}

onMounted(() => {
  searchTenor();
})
</script>
<style lang="scss" scoped>
</style>
