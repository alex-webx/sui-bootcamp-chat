import { ref, Ref, onMounted, onUnmounted } from 'vue';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface AsyncLoopControls {
  isRunning: Ref<boolean>;
  startLoop: () => void;
  stopLoop: () => void;
}

export function useAsyncLoop(
  asyncFunction: (isFirstExecution: boolean) => Promise<void>,
  intervalMs: number,
  // Novo parâmetro para controlar se deve executar imediatamente na inicialização
  executeImmediately: boolean = true
): AsyncLoopControls {
  const timeoutId: Ref<any | null> = ref(null);
  const isRunning = ref(false);
  const isFirstExecution = ref(true);

  const scheduleNextCall = async (): Promise<void> => {
    if (!isRunning.value) return;

    try {
      await asyncFunction(isFirstExecution.value); // <-- A função é executada AQUI, dentro do agendador
      isFirstExecution.value = false;
    } catch (error) {
      console.error("Erro no loop assíncrono:", error);
    }

    // Após a execução e o atraso, agendamos a próxima iteração
    timeoutId.value = setTimeout(() => scheduleNextCall(), intervalMs);
  };

  const startLoop = (): void => {
    if (!isRunning.value) {
      isRunning.value = true;
      // Quando iniciamos o loop, chamamos o scheduleNextCall,
      // que imediatamente executa a função e agenda o próximo atraso.
      scheduleNextCall();
    }
  };

  const stopLoop = (): void => {
    isRunning.value = false;
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }
  };

  // Gerenciamento do Ciclo de Vida Interno
  onMounted(() => {
    if (executeImmediately) {
      startLoop();
    }
  });

  onUnmounted(() => {
    stopLoop();
  });

  return {
    isRunning,
    startLoop,
    stopLoop
  };
}
