import { useSuiClientStore } from './stores/suiClientStore';
import envDevnet from '../.env.devnet?raw';
import envTestnet from '../.env.testnet?raw';
import envMainnet from '../.env.mainnet?raw';
import { tiControlShuffle } from '@quasar/extras/themify';

type Env = 'mainnet' | 'testnet' | 'devnet';
type EnvKey = keyof typeof defaultValues;

export const defaultValues = {
  PACKAGE_ID: '',
  CHAT_ROOM_REGISTRY_ID: '',
  USER_PROFILE_REGISTRY_ID: '',
  SUI_CLOCK_ID: '0x6',
  COMMIT_REF: process.env.COMMIT_REF!
};

const parseEnvFile = (content: string) => {
  const envConfig = content.split('\n').map(line => {
    const tokens = line.split('=');
    return { key: tokens[0]?.trim() as EnvKey, value: tokens[1]?.trim()! };
  }).reduce((acc, pair) => {
    acc[pair.key] = pair.value;
    return acc;
  }, {} as typeof defaultValues);

  return {
    ...defaultValues,
    ...envConfig
  };
};


export const defaultEnvValues = {
  devnet: parseEnvFile(envDevnet),
  testnet: parseEnvFile(envTestnet),
  mainnet: parseEnvFile(envMainnet)
};


const getConstant = (key: EnvKey) => {
  const network = useSuiClientStore().network;

  const valueFromLocalStorage = localStorage.getItem(`${network}::${key}`);
  if (valueFromLocalStorage !== null) {
    return valueFromLocalStorage;
  }

  const defaultEnvValue = defaultEnvValues[network];
  if (defaultEnvValue?.[key]) {
    return defaultEnvValue[key];
  }

  return defaultValues[key];
};

export const setConstant = (key: EnvKey, value: string) => {
  const network = useSuiClientStore().network;
  localStorage.setItem(`${network}::${key}`, value);
};

export const resetAllConstants = () => {
  const network = useSuiClientStore().network;
  Object.keys(defaultValues).forEach(key => {
    localStorage.removeItem(`${network}::${key}`);
  });
};

export const getAllConstants = () => {
  const keys: EnvKey[] = Object.keys(defaultValues) as (keyof typeof defaultValues)[];
  const network = useSuiClientStore().network;

  const constants = keys.reduce((acc, key) => {
    acc[key] = getConstant(key);
    return acc;
  }, {} as typeof defaultValues);

  return constants;
};

export default getConstant;
