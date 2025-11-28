import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Screen } from 'quasar';

export const useUiStore = defineStore('uiStore', () => {
  const breakpoint = 800;
  const screenWidth = computed(() => Screen.width);
  const desktopMode = computed(() => Screen.width > breakpoint);
  const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);
  const leftDrawerOpen = ref(true);
  const rightDrawerOpen = ref(false);
  const bottomChatElement = ref<InstanceType<typeof HTMLDivElement>>();

  const scrollTo = (where: 'bottom', behavior: 'smooth' | 'auto' | 'instant' = 'smooth') => {
    if (where === 'bottom') {
      setTimeout(() => {
        bottomChatElement.value?.scrollIntoView({ behavior, block: 'center' });
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
