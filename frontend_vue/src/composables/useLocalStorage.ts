import { ref, watch } from 'vue';

/**
 * Composable para gerenciar uma string no localStorage com reatividade.
 * @param {string} key A chave do localStorage
 * @param {string} defaultValue O valor padrão se a chave não existir
 */
export function useLocalStorage(key: string, defaultValue = '') {
  // 1. Inicializa o estado reativo lendo do localStorage ou usando o padrão
  const value = ref(localStorage.getItem(key) || defaultValue);

  // 2. Assiste a mudanças na ref local e sincroniza com o localStorage
  watch(value, (newValue) => {
    try {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, newValue);
      }
    } catch (error) {
      console.error(`Erro ao salvar no localStorage para a chave "${key}":`, error);
    }
  }, { immediate: true }); // Executa imediatamente para garantir que o LS esteja sincronizado na inicialização

  // 3. Retorna a ref. O Vue 3 lida com o getter/setter automaticamente via .value
  return value;
}
