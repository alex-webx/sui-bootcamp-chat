<template lang="pug">
q-layout.bg-ocean
  q-page-container
    q-page.text-white
      .q-pa-md
        .row.q-col-gutter-x-md.q-col-gutter-y-md
          .col-xs.q-gutter-y-md
            q-input(
              v-model="objectId"
              dark filled label="Object ID"
              :hint="objectRes?.data?.type.split('::').slice(-2).join('::')"
            )

            VueJsonPretty(:data="objectObj" :editable="true" :showIcon="true")

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

const objectId = ref(constants.UserProfileRegistryId);
const objectRes = ref({});
const objectObj = ref({});

const loadObject = async (objId: string) => {

  const readFields = async (obj: any) => {
    const t = typeof obj;
    if (t !== 'object') {
      return;
    }
    for (let key of Object.keys(obj)) {
      if (key == 'id' && obj[key]?.id && Object.keys(obj[key]).length === 1) {
        obj[key] = obj[key]?.id;
      //} else if ((obj[key] as any)?.type == '0x2::table::Table<address, 0x2::object::ID>') {
      } else if ((obj[key] as any)?.type?.startsWith('0x2::table::Table<')) {
        obj[key] = obj[key]?.fields;
        obj[key].__table_id = obj[key]?.id?.id;

        const dynFields: any = [];
        let hasNextPage = true;
        let cursor : any = undefined;
        while (hasNextPage) {
          const res = await client.getDynamicFields({ parentId: obj[key]?.id?.id, cursor });
          dynFields.push(...res.data);
          cursor = res.nextCursor;
          hasNextPage = res.hasNextPage;
        }

        const dynFieldsContent: any = [];
        for (let dynField of dynFields) {
          const dynFieldContent = (await client.getObject({
            id: dynField.objectId,
            options: { showContent: true }
          }) as any)?.data?.content?.fields;

          let content = {};
          if (dynField.objectType === '0x0000000000000000000000000000000000000000000000000000000000000002::object::ID') {
            content = (await loadObject(dynFieldContent.value)).obj;
          }

          dynFieldsContent.push({
            key: dynField.name,
            value: { ...dynFieldContent, type: dynField.objectType },
            content
          });
        }
        obj[key].__table_data = dynFieldsContent;
        await readFields(obj[key]);
      } else {
        await readFields(obj[key]);
      }
    }
  };

  let objRes = await client.getObject({ id: objId, options: { showContent: true, showBcs: true, showDisplay: true, showOwner: true, showPreviousTransaction: true, showStorageRebate: true, showType: true } });
  let obj = (objRes as any)?.data?.content?.fields;
  await readFields(obj);
  return { objRes, obj };
};

onMounted(async () => {
  const res = await loadObject(objectId.value);
  objectObj.value = res.obj;
  objectRes.value = res.objRes;
});

watch(objectId, async objId => {
  const res = await loadObject(objId);
  objectObj.value = res.obj;
  objectRes.value = res.objRes;
});


</script>
