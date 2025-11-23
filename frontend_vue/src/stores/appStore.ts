import { acceptHMRUpdate, defineStore } from 'pinia';
import { useUiStore, useUserStore, useWalletStore, useChatListStore } from './';
import { userProfileModule, chatRoomModule } from '../move';

export const useAppStore = defineStore('appStore', () => {
  const chatListStore = useChatListStore();
  const uiStore = useUiStore();
  const userStore = useUserStore();
  const walletStore = useWalletStore();

  const resetState = async () => {
    await chatListStore.resetState();
    await uiStore.resetState();
    await userStore.resetState();
    await walletStore.resetState();
  };

  const checkUserProfilesRegistry = async() => {
    try {
      return !!(await userProfileModule.getUserProfileRegistry());
    } catch {
      return false;
    }
  };

  const checkChatRoomRegistry = async() => {
    try {
      return !!(await chatRoomModule.getChatRoomRegistry());
    } catch {
      return false;
    }
  };

  const checkDeploy = async () => {
    return await checkChatRoomRegistry() && await checkUserProfilesRegistry();
  };

  return {
    resetState,
    checkDeploy
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot));
}
