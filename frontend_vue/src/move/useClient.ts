import _ from 'lodash';
import { DynamicFieldInfo, SuiClient, SuiObjectChange, SuiObjectResponse, SuiTransactionBlockResponse, getFullnodeUrl } from '@mysten/sui/client';
import { type Network, useConfig } from '../../configs';

export const getNetwork = () => (localStorage.getItem('SUI_NETWORK') || 'devnet') as Network;
export const setNetwork = (network: Network) => localStorage.setItem('SUI_NETWORK', network);
export const client = new SuiClient({ url: getFullnodeUrl(getNetwork()) });

export type SuiObjectChangeCreated = Extract<SuiObjectChange, { type: 'created' }>;
export type SuiObjectChangePublished = Extract<SuiObjectChange, { type: 'published' }>;
export type SuiObjectChangeTransferred = Extract<SuiObjectChange, { type: 'transferred' }>;
export type SuiObjectChangeMutated = Extract<SuiObjectChange, { type: 'mutated' }>;
export type SuiObjectChangeDeleted = Extract<SuiObjectChange, { type: 'deleted' }>;
export type SuiObjectChangeWrapped = Extract<SuiObjectChange, { type: 'wrapped' }>;

export const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

const getObjectType = (
    structName: 'user_profile::UserProfile' | 'user_profile::UserProfileRegistry' | 'chat_room::ChatRoom' | 'chat_room::ChatRoomRegistry' | 'chat_room::Message'
) => {
  return `${config('PackageId')}::${structName}`;
};

export const parsers = {
  isDeleted: (objectId: string) => {
    return (res: SuiTransactionBlockResponse) => {
      const profileDeleted = res.effects?.deleted?.find(change => change.objectId === objectId);
      return !!profileDeleted?.objectId;
    };
  },
  isCreated: (objectType: Parameters<typeof getObjectType>[0]) => {
    return (res: SuiTransactionBlockResponse) => {
      const profileUpdated = res.objectChanges?.find(change => change.type === 'created' && change.objectType === getObjectType(objectType)) as SuiObjectChangeCreated | undefined;
      return profileUpdated?.objectId;
    };
  },
  isUpdated: (objectType: Parameters<typeof getObjectType>[0]) => {
    return (res: SuiTransactionBlockResponse) => {
      const profileUpdated = res.objectChanges?.find(change => change.type === 'mutated' && change.objectType === getObjectType(objectType)) as SuiObjectChangeMutated | undefined;
      return profileUpdated?.objectId;
    };
  }
};


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
