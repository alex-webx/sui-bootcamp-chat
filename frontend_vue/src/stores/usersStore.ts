import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type UserProfile, userProfileModule } from '../move';
import { useWalletStore } from './';
import _, { Dictionary } from 'lodash';

export const useUsersStore = defineStore('usersStore', () => {
  const walletStore = useWalletStore();

  const users = ref<Dictionary<UserProfile>>({});
  const profileToAddress = computed(() => {
    return _(users.value).keyBy(profile => profile.id).mapValues(profile => profile.owner).value();
  });

  const fetchAllUsersProfiles = async () => {
    const usersProfiles = await userProfileModule.getAllUsersProfiles();
    users.value = _(usersProfiles).keyBy(user => user.owner).value();
  };

  const checkUserProfilesRegistry = async() => {
    try {
      return !!(await userProfileModule.getUserProfileRegistry());
    } catch {
      return false;
    }
  };

  return {
    users,
    profileToAddress,

    fetchAllUsersProfiles,
    checkUserProfilesRegistry,

    resetState: async () => {
      users.value = {};
    }
  };
});
