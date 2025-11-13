import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type UserProfile, useUserProfileContractService } from '../services/userProfileContractService';
import { useWalletStore } from './walletStore';
import _, { Dictionary } from 'lodash';

export const useUsersStore = defineStore('usersStore', () => {
  const userProfileSvc = useUserProfileContractService();
  const walletStore = useWalletStore();

  const profiles = ref<Dictionary<UserProfile>>({});
  const addressToProfileMap = computed(() => {
    return _.keyBy(profiles.value, profile => profile.owner);
  });

  const fetchAllUsersProfiles = async () => {
    const users = await userProfileSvc.getAllUsersProfiles();
    profiles.value = _(users).keyBy(user => user.id).value();
  };

  const checkUserProfilesRegistry = async() => {
    try {
      return !(await userProfileSvc.getUserProfileRegistry())?.error;
    } catch {
      return false;
    }
  };



  return {
    profiles,
    addressToProfileMap,

    fetchAllUsersProfiles,
    checkUserProfilesRegistry,

    resetState: async () => {
      profiles.value = {};
    }
  };
});
