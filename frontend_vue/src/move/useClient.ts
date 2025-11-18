import { SuiClient, SuiObjectChange, SuiTransactionBlockResponse, getFullnodeUrl } from '@mysten/sui/client';
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

const config = (arg: Parameters<ReturnType<typeof useConfig>['getConfig']>[0]) => useConfig().getConfig(arg);

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
