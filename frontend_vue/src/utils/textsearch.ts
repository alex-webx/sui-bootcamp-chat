// --- 1. Criar o Collator UMA VEZ ---
// 'base' sensitivity: ignora case (A=a) e accents (a=á)
// 'usage: search' otimiza o algoritmo interno para operações de busca/filtro
const collatorSearch = new Intl.Collator(undefined, {
    sensitivity: 'base',
    usage: 'search'
});

/**
 * Função auxiliar que simula um 'indexOf' usando as regras do Collator.
 * Retorna true se encontrar, false caso contrário.
 *
 * NOTA: Isso é menos performático que o indexOf nativo, pois compara caractere por caractere
 * usando regras linguísticas complexas.
 */
export function containsText(container: string, searchText: string): boolean {
    // Caso trivial: se a busca for vazia, sempre "contém" no início.
    if (searchText.length === 0) return true;

    // Iteramos por todas as posições possíveis na string principal
    for (let i = 0; i <= container.length - searchText.length; i++) {
        // Extraímos um segmento do container do mesmo tamanho que o searchText
        const segment = container.substring(i, i + searchText.length);

        // Usamos o Collator para comparar o segmento com o texto de busca
        // Se 'compare' retornar 0, significa que os textos são considerados iguais
        // de acordo com as regras de 'sensitivity: base' (ignora case/accent).
        if (collatorSearch.compare(segment, searchText) === 0) {
            return true; // Encontrou uma correspondência
        }
    }

    return false; // Não encontrou
}
