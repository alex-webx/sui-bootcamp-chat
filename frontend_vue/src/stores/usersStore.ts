import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type UserProfile, userProfileModule } from '../move';
import { useWalletStore } from './';
import _, { Dictionary } from 'lodash';

export const useUsersStore = defineStore('usersStore', () => {
  const walletStore = useWalletStore();

  const users = ref<Dictionary<UserProfile>>({});
  const addressToProfileMap = computed(() => {
    return _.keyBy(users.value, profile => profile.owner);
  });

  const fetchAllUsersProfiles = async () => {
    const usersProfiles = await userProfileModule.getAllUsersProfiles();
    users.value = _(usersProfiles).keyBy(user => user.id).value();
  };

  const checkUserProfilesRegistry = async() => {
    try {
      return !(await userProfileModule.getUserProfileRegistry())?.error;
    } catch {
      return false;
    }
  };

  return {
    users,
    addressToProfileMap,

    fetchAllUsersProfiles,
    checkUserProfilesRegistry,

    resetState: async () => {
      users.value = {};
    }
  };
});
