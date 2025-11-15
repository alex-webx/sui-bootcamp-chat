import { ref } from 'vue';

export function useCompostable () {
  const v = ref('');

  return {
    v

  };
};
