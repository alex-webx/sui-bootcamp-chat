import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { UserProfile, userProfileModule, getSuiBalance } from '../move';
import { useWalletStore } from './';
import { UserProfileGenerator, UserProfileService } from '../utils/encrypt';
import { formatCoinBalance } from '../utils/formatters';

export const useUserStore = defineStore('userStore', () => {
  const walletStore = useWalletStore();

  const profile = ref<UserProfile>();
  const suiBalance = ref<BigInt>();

  const fetchCurrentUserProfile = async () => {
    if (!walletStore.address) {
      profile.value = undefined;
      return profile.value;
    }

    let preservedKeyPriv: CryptoKey | undefined;

    if (walletStore.address === profile.value?.owner && profile.value?.keyPrivDecoded) {
      preservedKeyPriv = profile.value?.keyPrivDecoded;
    }

    profile.value = await userProfileModule.getUserProfile(walletStore.address!);

    if (walletStore.address === profile.value?.owner && preservedKeyPriv) {
      profile.value!.keyPrivDecoded = preservedKeyPriv;
    }

    await getUserSuiBalance();

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
      profile.value.keyPrivDecoded = await new UserProfileService().unwrapPrivateKey({
        publicKeySpki: profile.value.keyPub,
        privateKeyWrapped: profile.value.keyPrivDerived,
        iv: profile.value.keyIv,
        salt: profile.value.keySalt
      }, masterSignature?.signature);
      return profile.value.keyPrivDecoded;
    }

    return null;
  };


  const createUserProfile = async (userProfile: Pick<UserProfile, 'username' | 'avatarUrl'>) => {
    const response = await walletStore.generateMasterSignature();
    const keys = await new UserProfileGenerator().generateProfileKeys(response?.signature!);

    const { tx, parser } = userProfileModule.txCreateUserProfile({
      ...userProfile,
      keyPub: keys.publicKeySpki,
      keyPrivDerived: keys.privateKeyWrapped,
      keyIv: keys.iv,
      keySalt: keys.salt
    });

    const profileId = parser(await walletStore.signAndExecuteTransaction(tx));
    await fetchCurrentUserProfile();
    if (profile.value) {
      profile.value.keyPrivDecoded = await new UserProfileService().unwrapPrivateKey(keys, response?.signature!);
    }

    return profileId;
  };

  const deleteUserProfile = async () => {
    const profile = await fetchCurrentUserProfile();
    if (profile) {
      const { tx, parser } = userProfileModule.txDeleteUserProfile(profile.id);
      const deleted = parser(await walletStore.signAndExecuteTransaction(tx));
      return deleted;
    }
    return false;
  };

  const updateUserProfile = async (newProfile: Pick<UserProfile, 'avatarUrl' | 'username'>) => {
    const profile = await fetchCurrentUserProfile();
    if (profile) {
      const { tx, parser } =  userProfileModule.txUpdateUserProfile(profile.id, newProfile);
      return parser(await walletStore.signAndExecuteTransaction(tx));
    }
    return false;
  };

  const getUserSuiBalance = async () => {
    suiBalance.value = await getSuiBalance(profile.value?.owner!);
  };

  return {
    profile,
    suiBalance,
    suiBalanceFormatted: computed(() => formatCoinBalance(suiBalance.value!, 9, 2)),

    fetchCurrentUserProfile,
    ensurePrivateKey,
    createUserProfile,
    deleteUserProfile,
    updateUserProfile,

    resetState: async () => {
      profile.value = undefined;
      suiBalance.value = undefined;
    }
  };
});
