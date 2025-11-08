import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";
import { constants } from './constants';

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        ...constants.DEVNET
      }
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        ...constants.TESTNET
      }
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        ...constants.MAINNET
      }
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
