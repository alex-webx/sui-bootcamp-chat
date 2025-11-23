import { acceptHMRUpdate, defineStore } from 'pinia';
import { useUserStore, useWalletStore, useChatListStore } from './';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, Notify, Screen } from 'quasar';

export const useUiStore = defineStore('uiStore', () => {
  const userStore = useUserStore();
  const walletStore = useWalletStore();
  const chatListStore = useChatListStore();

  const breakpoint = 800;
  const screenWidth = computed(() => Screen.width);
  const desktopMode = computed(() => Screen.width > breakpoint);
  const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);
  const leftDrawerOpen = ref(true);
  const rightDrawerOpen = ref(false);
  const bottomChatElement = ref<InstanceType<typeof HTMLDivElement>>();

  const scrollTo = (where: 'bottom') => {
    if (where === 'bottom') {
      setTimeout(() => {
        bottomChatElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  };

  return {
    resetState: async () => {},
    scrollTo,

    breakpoint,
    screenWidth,
    desktopMode,
    drawerWidth,
    leftDrawerOpen,
    rightDrawerOpen,
    bottomChatElement
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUiStore, import.meta.hot));
}
