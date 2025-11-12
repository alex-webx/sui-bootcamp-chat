import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type UserProfile, useUserProfileContractService } from './services/userProfileContractService';
import { useWalletStore } from './walletStore';

export const useUserStore = defineStore('userStore', () => {
  const userProfileSvc = useUserProfileContractService();
  const walletStore = useWalletStore();

  const profile = ref<UserProfile>();

  const fetchCurrentUserProfile = async () => {
    if (walletStore.address) {
      profile.value = await userProfileSvc.getUserProfile(walletStore.address!);
    } else {
      profile.value = undefined;
    }

    return profile.value;
  };

  const createUserProfile = async (userProfile: Pick<UserProfile, 'username' | 'avatarUrl'>) => {
    await userProfileSvc.createUserProfile(userProfile);
    await fetchCurrentUserProfile();
    return profile.value;
  };

  const deleteUserProfile = async () => {
    const profile = await fetchCurrentUserProfile();
    if (profile) {
      await userProfileSvc.deleteUserProfile(profile.id);
    }
    return true;
  }

  return {
    profile,

    fetchCurrentUserProfile,
    createUserProfile,
    deleteUserProfile,

    resetState: async () => {
      profile.value = undefined;
    }
  };
});
