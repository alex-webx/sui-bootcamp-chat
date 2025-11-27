import { ref, Ref, onMounted, onUnmounted } from 'vue';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface AsyncLoopControls {
  isRunning: Ref<boolean>;
  startLoop: () => void;
  stopLoop: () => void;
}

export interface AsyncLoopControlsWithLifecycle {
  executeImmediately?: boolean;
}

/**
 * Hook auxiliar que gerencia o ciclo de vida do useAsyncLoop automaticamente
 * dentro de um contexto de componente Vue.
 */
export function useAsyncLoopWithLifecycle(
  asyncFunction: (isFirstExecution: boolean) => Promise<void>,
  intervalMs: number,
  options: AsyncLoopControlsWithLifecycle = { executeImmediately: true }
): AsyncLoopControls {
  const controls = useAsyncLoop(asyncFunction, intervalMs);
  const { startLoop, stopLoop } = controls;
  const { executeImmediately } = options;

  // Estes hooks funcionarão APENAS se chamados dentro de setup()
  // Se chamados fora, eles falham silenciosamente, o que é o comportamento desejado.
  try {
    onMounted(() => {
      if (executeImmediately) {
        startLoop();
      }
    });

    onUnmounted(() => {
      stopLoop();
    });
  } catch (e) {
    // Captura erros se onMounted/onUnmounted forem chamados fora de um contexto Vue válido
    console.warn("useAsyncLoopWithLifecycle: Não foi possível anexar hooks de ciclo de vida. Certifique-se de chamar startLoop/stopLoop manualmente.");
  }

  return controls;
}


export function useAsyncLoop(
  asyncFunction: (isFirstExecution: boolean) => Promise<void>,
  intervalMs: number
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

  return {
    isRunning,
    startLoop,
    stopLoop
  };
}
