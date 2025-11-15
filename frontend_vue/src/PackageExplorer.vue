<template lang="pug">
q-layout.bg-ocean
  q-page-container
    q-page.text-white
      .q-pa-md
        .row.q-col-gutter-x-md.q-col-gutter-y-md
          .col-xs-12
            q-input(
              v-model="packageId"
              dark filled label="Package ID"
            )

          .col-xs-4.col-sm-4
            q-list(dark)
              template(v-for="(mod, modName, modIndex) in modules" :key="modName")
                q-separator(dark spaced v-if="modIndex > 0")
                q-item(@click="selectedModule = mod" clickable)
                  q-item-section
                    q-item-label
                      | {{ modName }}

                    q-item-label(
                      v-for="(struct, structName) in mod.structs" :key="structName"
                      caption
                    )
                      span.q-ml-sm - struct {{ structName }}

                    q-item-label(
                      v-for="(fund, funcName) in mod.exposedFunctions" :key="funcName"
                      caption
                    )
                      span.q-ml-sm - fun {{ funcName }}()

          .col-xs-8.col-sm-8
            JsonViewer(:data="selectedModule")

</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useClient } from './move/useClient';
import _ from 'lodash';

const constants = {
  "PackageId": "0xf6a60fcacded21fca69af513156805cbbf66a5a525e96cc8fe58434a72672d3f",
  "UserProfileRegistryId": "0xba3b027ac129724388022c223d7fab00043dc6f3aa10f27602c1c7782df67738",
  "ChatRoomRegistryId": "0x1cfb9a7973337e13da7379851b366d5f68d6f49f484ab10b1b1fefd3444d927f"
};

const client = useClient().client.value;

const packageId = ref(constants.PackageId);
const modules = ref({});
const selectedModule = ref({});

const loadPackage = async (packageId: string) => {
  const modules = await client.getNormalizedMoveModulesByPackage({
    package: packageId,
  });
  return modules;
};

onMounted(async () => {
  modules.value = await loadPackage(packageId.value);
});

watch(packageId, async pkgId => {
  modules.value = await loadPackage(pkgId);
});

</script>
