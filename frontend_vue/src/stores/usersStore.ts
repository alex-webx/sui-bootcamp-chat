import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type UserProfile, userProfileModule } from '../move';
import { useWalletStore } from './';
import _, { Dictionary } from 'lodash';
import { acceptHMRUpdate } from 'pinia';

export const useUsersStore = defineStore('usersStore', () => {
  const walletStore = useWalletStore();

  const checkUserProfilesRegistry = async() => {
    try {
      return !!(await userProfileModule.getUserProfileRegistry());
    } catch {
      return false;
    }
  };

  return {
    checkUserProfilesRegistry,

    resetState: async () => {
    }
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
