import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { UserProfile, userProfileModule } from '../move';
import { useWalletStore } from './';
import * as encrypt from '../utils/encrypt';

export const useUserStore = defineStore('userStore', () => {
  const walletStore = useWalletStore();

  const profile = ref<UserProfile>();
  const profilePrivKey = ref<CryptoKey>();

  const fetchCurrentUserProfile = async () => {
    if (walletStore.address) {
      profile.value = await userProfileModule.getUserProfile(walletStore.address!);
    } else {
      profile.value = undefined;
    }

    return profile.value;
  };

  const ensurePrivateKey = async () => {
    if (!profile.value) {
      return;
    }

    if (profile?.value?.keyPrivDecoded) {
      return profile?.value.keyPrivDecoded;
    }

    const masterSignature = await walletStore.generateMasterSignature();
    if (masterSignature) {
      profile.value.keyPrivDecoded = await encrypt.decryptPrivateKey({
        publicKey: profile.value.keyPub,
        encryptedKey: profile.value.keyPrivDerived,
        iv: profile.value.keyIv,
        salt: profile.value.keySalt
      }, masterSignature?.signature);
      return profile.value.keyPrivDecoded;
    }

    return null;
  };


  const createUserProfile = async (userProfile: Pick<UserProfile, 'username' | 'avatarUrl'>) => {
    const response = await walletStore.generateMasterSignature();
    const keys = await encrypt.generateKeysWithSignature(response!.signature);

    {
      const keyPrivDecoded = await encrypt.decryptPrivateKey({
          publicKey: keys.publicKey,
          encryptedKey: keys.encryptedKey,
          iv: keys.iv,
          salt: keys.salt
        },
        response!.signature
      );

      console.log(keyPrivDecoded);
    }

    await userProfileModule.createUserProfile({
      ...userProfile,
      keyPub: keys.publicKey,
      keyPrivDerived: keys.encryptedKey,
      keyIv: keys.iv,
      keySalt: keys.salt
    });
    await fetchCurrentUserProfile();

    return profile.value;
  };

  const deleteUserProfile = async () => {
    const profile = await fetchCurrentUserProfile();
    if (profile) {
      await userProfileModule.deleteUserProfile(profile.id);
    }
    return true;
  };

  const updateUserProfile = async (newProfile: Pick<UserProfile, 'avatarUrl' | 'username'>) => {
    const profile = await fetchCurrentUserProfile();
    if (profile) {
      await userProfileModule.updateUserProfile(profile.id, newProfile);
    }
    return true;
  };

  return {
    profile,

    fetchCurrentUserProfile,
    ensurePrivateKey,
    createUserProfile,
    deleteUserProfile,
    updateUserProfile,

    resetState: async () => {
      profile.value = undefined;
      profilePrivKey.value = undefined;
    }
  };
});
