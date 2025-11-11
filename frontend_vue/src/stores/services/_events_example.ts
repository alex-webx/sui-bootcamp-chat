// import { Transaction } from '@mysten/sui/transactions';
// import { useSuiClientStore } from '../suiClientStore';
// import { useWalletStore } from '../walletStore';
// import { SuiMoveObject, SuiObjectResponse } from '@mysten/sui/client';
// import { useUserProfileContractService, type UserProfile } from './userProfileContractService';
// import { PropType } from 'vue';

// export type UserProfileRegistry = {
//   id: string,
//   users: Map<string, string>, // mapping wallet address -> profile id
// }

// // public struct UserProfileEvent has copy, drop {
// //     event_type: String,
// //     profile_id: ID,
// //     owner: address,
// //     username: option::Option<String>,
// //     avatar_url: option::Option<String>,
// //     timestamp: option::Option<u64>,
// // }


// export function useUserProfileRegistryContractService() {

//   const suiClientStore = useSuiClientStore();
//   const walletStore = useWalletStore();
//   const userProfileCS = useUserProfileContractService();

//   const getUserProfileRegistryByEvents = async () => {
//     const EVENT_BATCH_SIZE = 50;
//     const PROFILE_BATCH_SIZE = 50;

//     let allProfilesIds: string[] = [];
//     let cursor: any = null;
//     let hasMoreEvents = true;

//     while (hasMoreEvents) {

//       const events = await suiClientStore.client.queryEvents({
//         query: {
//           MoveEventType: `${Constants.PACKAGE_ID}::user_profile::UserProfileEvent`
//         },
//         limit: EVENT_BATCH_SIZE,
//         order: 'ascending',
//         cursor: cursor || undefined
//       });

//       const profileIds = events.data.map(event => (event.parsedJson as any).profile_id).filter(Boolean);
//       allProfilesIds.push(...profileIds);
//       cursor = events.nextCursor || undefined;
//       hasMoreEvents = events.hasNextPage;
//     }

//     const fetchedProfiles: UserProfile[] = [];

//     for (let i = 0; i < allProfilesIds.length; i += PROFILE_BATCH_SIZE) {
//       const batch = allProfilesIds.slice(i, i + PROFILE_BATCH_SIZE);
//       const profilesResponse = await suiClientStore.client.multiGetObjects({
//         ids: batch,
//         options: { showContent: true }
//       });

//       fetchedProfiles.push(...profilesResponse.map(userProfileCS.parseUserProfile));
//     }

//     return fetchedProfiles;
//   }

//   return {
//   };
// }
