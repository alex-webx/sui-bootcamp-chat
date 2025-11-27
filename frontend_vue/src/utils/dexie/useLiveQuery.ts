import { ref, getCurrentInstance, onUnmounted, readonly, watch, WatchSource } from 'vue';
import { liveQuery } from 'dexie';

type QueryResult<Q> = Q extends () => infer R
  ? (R extends Promise<infer U> ? U : R)
  : unknown;

export function useLiveQuery<Q extends Parameters<typeof liveQuery>[0]>(
  querier: Q,
  dependencies: WatchSource[] = []
) {
  return useLiveQueryWithError(querier, dependencies).result;
}

export function useLiveQueryWithError<Q extends Parameters<typeof liveQuery>[0]>(
  querier: Q,
  dependencies: WatchSource[] = []
) {

  type T = QueryResult<Q>;

  const result = ref<T | undefined>(undefined);
  const error = ref<Error | undefined>(undefined);
  let subscription: { unsubscribe: () => void } | undefined;

  const fetchData = () => {
    if (subscription) {
      subscription.unsubscribe();
    }

    const observable$ = liveQuery(querier);

    subscription = observable$.subscribe({
      next: value => {
        result.value = value;
        error.value = undefined;
      },
      error: err => {
        console.error("Dexie Live Query Error:", err);
        error.value = err;
      }
    });
  };

  if (getCurrentInstance()) {
    onUnmounted(() => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }

  if (dependencies.length > 0) {
    watch(dependencies, fetchData, { immediate: true, deep: true });
  } else {
    fetchData();
  }

  return {
    result: readonly(result),
    error: readonly(error)
  };
}
