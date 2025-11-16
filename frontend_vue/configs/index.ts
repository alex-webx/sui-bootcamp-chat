import { getNetwork } from '../src/move';
import configMoveDevnet from './.move.devnet.json';
import configMoveTestnet from './.move.testnet.json';
import configMoveMainnet from './.move.mainnet.json';
import configClientDevnet from './.client.devnet.json';
import configClientTestnet from './.client.testnet.json';
import configClientMainnet from './.client.mainnet.json';

export type Network = 'mainnet' | 'testnet' | 'devnet';

export function useConfig() {

  const network = getNetwork();

  const extraClientConfigs = {
    CommitRef: process.env.COMMIT_REF!
  };
  const clientConfigs = {
    devnet: { ...configClientDevnet, ...extraClientConfigs, network: 'devnet' },
    testnet: { ...configClientTestnet, ...extraClientConfigs, network: 'testnet' },
    mainnet: { ...configClientMainnet, ...extraClientConfigs, network: 'mainnet' },
  };

  const MOVE_EXTRA_KEYS = ['SuiClockId'] as const;
  type MoveExtraConfigKey = typeof MOVE_EXTRA_KEYS[number];
  type MoveConfigKey = keyof typeof configMoveDevnet | MoveExtraConfigKey;
  type ClientConfigKey = keyof typeof configClientDevnet | keyof typeof extraClientConfigs;
  type ConfigKey = MoveConfigKey | ClientConfigKey;

  const defaultValues: Partial<Record<MoveConfigKey, string>> = {
    SuiClockId: '0x6'
  };

  const networkConfigs: Record<Network, Partial<Record<MoveConfigKey, any>>> = {
    devnet: { ...defaultValues, ...configMoveDevnet },
    testnet: { ...defaultValues, ...configMoveTestnet },
    mainnet: { ...defaultValues, ...configMoveMainnet },
  };

  const getConfig = (key: ConfigKey): string | undefined => {
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

  const setNetworkConfig = (key: MoveConfigKey, value: string | undefined) => {
    if (value === undefined) {
      localStorage.removeItem(`${network}::${key}`);
    } else {
      localStorage.setItem(`${network}::${key}`, value);
    }
  };

  const resetAllNetworkConfigs = () => {
    Object.keys(networkConfigs[network]).forEach(key => {
      localStorage.removeItem(`${network}::${key}`);
    });
  };

  const getAllNetworkConfigs = (): Record<MoveConfigKey, string | undefined> => {
    const networkConfig = networkConfigs[network];
    const networkKeys: MoveConfigKey[] = Object.keys(networkConfig) as MoveConfigKey[];
    const networkValues = networkKeys.reduce((acc, key) => {
      acc[key] = getConfig(key);
      return acc;
    }, {} as Record<MoveConfigKey, ReturnType<typeof getConfig>>);

    return networkValues;
  };

  const getAllClientConfigs = (): Record<ClientConfigKey, string | undefined> => {
    return clientConfigs[network];
  };

  const getAllConfigs = (): Record<ConfigKey, string | undefined> => {
    return {
      ...getAllNetworkConfigs(),
      ...getAllClientConfigs()
    };
  };

  return {
    getConfig,
    setNetworkConfig,
    resetAllNetworkConfigs,
    getAllNetworkConfigs,
    getAllClientConfigs,
    getAllConfigs
  };
};
