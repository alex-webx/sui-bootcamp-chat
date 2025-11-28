<template lang="pug">
q-layout.bg-ocean
  q-page-container.text-white
    q-page.column.items-center.justify-start

      input(type="file" @change="uploadFile")


      .flex.fit.flex-center(v-for="img in urls")
        q-img(
          :src="img" style="width:200px"
        )

</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { getImageUrl, uploadImage } from './utils/walrus';

const uploadFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;

  if (input.files?.length) {
    const res = await uploadImage(input.files[0]!);
    console.log(res);
  }
};

const urls = ref<string[]>([]);
onMounted(async () => {
  const imgs = ['LuHmZ5olspxeGoJWVmJ4LEx35B21uy0Y3-PAIeIpwFo', 'WQ2cVRcqk58YGW8611Ns6NN3KrEoUQGtDPb4fua7EbM']
  for (let img of imgs) {
    urls.value.push(await getImageUrl(img));
  }
});

</script>
