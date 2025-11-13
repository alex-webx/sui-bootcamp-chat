import { useSuiClientStore } from '../src/stores/suiClientStore';
import configMoveDevnet from './.move.devnet.json';
import configMoveTestnet from './.move.testnet.json';
import configMoveMainnet from './.move.mainnet.json';
import configClientDevnet from './.client.devnet.json';
import configClientTestnet from './.client.testnet.json';
import configClientMainnet from './.client.mainnet.json';

type Network = 'mainnet' | 'testnet' | 'devnet';

const extraClientConfigs = {
  CommitRef: process.env.COMMIT_REF!
};
const clientConfigs = {
  devnet: { ...configClientDevnet, ...extraClientConfigs, network: 'devnet' },
  testnet: { ...configClientTestnet, ...extraClientConfigs, network: 'testnet' },
  mainnet: { ...configClientMainnet, ...extraClientConfigs, network: 'mainnet' }
};

const MOVE_EXTRA_KEYS = ['SuiClockId'] as const;
type MoveExtraConfigKey = typeof MOVE_EXTRA_KEYS[number];
type MoveConfigKey = keyof typeof configMoveDevnet | MoveExtraConfigKey;
type ClientConfigKey = keyof typeof configClientDevnet;
type ConfigKey = MoveConfigKey | ClientConfigKey;

const defaultValues: Partial<Record<MoveConfigKey, string>> = {
  SuiClockId: '0x6'
};

const networkConfigs: Record<Network, Partial<Record<MoveConfigKey, any>>> = {
  devnet: { ...defaultValues, ...configMoveDevnet },
  testnet: { ...defaultValues, ...configMoveTestnet },
  mainnet: { ...defaultValues, ...configMoveMainnet }
};

const getConfig = (key: ConfigKey): string | undefined => {
  const network = useSuiClientStore().network;
  const valueFromLocalStorage = localStorage.getItem(`${network}::${key}`);
  if (valueFromLocalStorage !== null) {
    return valueFromLocalStorage;
  }

  if (key in clientConfigs[network]) {
    return clientConfigs[network][key as ClientConfigKey];
  }

  if (key in networkConfigs[network]) {
    return networkConfigs[network][key as MoveConfigKey];
  }

  return undefined;
};

export const setNetworkConfig = (key: MoveConfigKey, value: string | undefined) => {
  const network = useSuiClientStore().network;
  if (value === undefined) {
    localStorage.removeItem(`${network}::${key}`);
  } else {
    localStorage.setItem(`${network}::${key}`, value);
  }
};

export const resetAllNetworkConfigs = () => {
  const network = useSuiClientStore().network;
  Object.keys(networkConfigs[network]).forEach(key => {
    localStorage.removeItem(`${network}::${key}`);
  });
};

export const getAllNetworkConfigs = (): Record<MoveConfigKey, string | undefined> => {
  const network = useSuiClientStore().network;

  const networkConfig = networkConfigs[network];
  const networkKeys: MoveConfigKey[] = Object.keys(networkConfig) as MoveConfigKey[];
  const networkValues = networkKeys.reduce((acc, key) => {
    acc[key] = getConfig(key);
    return acc;
  }, {} as Record<MoveConfigKey, ReturnType<typeof getConfig>>);

  return networkValues;
};

export const getAllClientConfigs = (): Record<ClientConfigKey, string | undefined> => {
  const network = useSuiClientStore().network;
  return clientConfigs[network];
};

export const getAllConfigs = (): Record<ConfigKey, string | undefined> => {
  return {
    ...getAllNetworkConfigs(),
    ...getAllClientConfigs()
  };
};

export default getConfig;
