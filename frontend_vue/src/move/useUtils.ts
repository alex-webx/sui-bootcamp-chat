import _ from 'lodash';
import { client } from './useClient';
import { useConfig } from '../../configs';
import { type SuiObjectResponse, type DynamicFieldInfo } from '@mysten/sui/client';

export const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

export const getFullTable = async (field: { fields: { id: { id: string }, size: string }, type: `0x2::table::Table<${string}` }) => {

  if (!field.type.startsWith('0x2::table::Table<')) {
    throw 'Not a table ' + field.type;
  }

  let hasNextPage = true;
  let cursor: string | null = null;

  let items: { key: string, value: string, content?: any }[] = [];

  while(hasNextPage) {
    const res = await client.getDynamicFields({ parentId: field.fields.id.id, cursor });
    hasNextPage = res.hasNextPage;
    cursor = res.nextCursor;

    const rows = res.data.map(row => ({
      key: row.name.value as string,
      value: row.objectId
    }));
    items.push(...rows);
  }

  let res: Record<string, any> = {};

  for (let chunk of _.chunk(items, 50)) {
    const objs = await client.multiGetObjects({
      ids: chunk.map(item => item.value),
      options: { showContent: true }
    });

    objs.forEach((obj, index) => {
      res[items[index]?.key!] = (obj.data?.content as any)?.fields?.value;
    });
  }

  return res;
}

export const getMultiObjects = async (args: { ids: string[], pageSize?: number }) => {
  const chunks = _.chunk(args.ids, args.pageSize || 50);
  const results: SuiObjectResponse[] = [];

  for (let chunk of chunks) {
    const res = await client.multiGetObjects({
      ids: chunk,
      options: { showContent: true },
    });
    results.push(...res);
  }

  return results;
}

export const getDynamicFields = async (args: { parentId: string, pageSize?: number }) => {
  let hasNextPage = true;
  let cursor: string | null = null;
  let fields: DynamicFieldInfo[] = [];

  while (hasNextPage) {
    const response = await client.getDynamicFields({
      parentId: args.parentId,
      cursor: cursor || undefined,
      limit: args.pageSize || 50
    });

    cursor = response.nextCursor;
    hasNextPage = response.hasNextPage;
    fields.push(...response.data);
  }
  return fields;
};
