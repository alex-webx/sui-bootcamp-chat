import { acceptHMRUpdate, defineStore } from 'pinia';
import { useChatRoomStore, useUserStore, useUsersStore, useWalletStore } from './';

export const useAppStore = defineStore('appStore', () => {
  const chatRoomStore = useChatRoomStore();
  const userStore = useUserStore();
  const usersStore = useUsersStore();
  const walletStore = useWalletStore();

  const resetState = async () => {
    await chatRoomStore.resetState();
    await userStore.resetState();
    await usersStore.resetState();
    await walletStore.resetState();
  };

  const checkDeploy = async () => {
    return await chatRoomStore.checkChatRoomRegistry() && await usersStore.checkUserProfilesRegistry();
  };

  return {
    resetState,
    checkDeploy
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot));
}
