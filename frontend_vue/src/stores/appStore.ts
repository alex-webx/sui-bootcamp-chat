import { defineStore } from 'pinia';
import { useChatRoomStore } from './chatRoomStore';
import { useUserStore } from './userStore';
import { useUsersStore } from './usersStore';
import { useWalletStore } from './walletStore';

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
