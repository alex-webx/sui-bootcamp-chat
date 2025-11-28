// Mapeamento dos "magic numbers" (assinaturas de bytes iniciais) para tipos de imagem comuns
const imageSignatures: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF87a or GIF89a
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (para WebP precisamos de uma checagem mais complexa, mas isso identifica o container RIFF)
};

/**
 * Verifica se o ArrayBuffer corresponde a uma assinatura de imagem conhecida.
 * @param buffer O ArrayBuffer contendo os bytes iniciais do arquivo.
 * @returns O tipo MIME se for uma imagem válida, ou null se não for.
 */
const checkMagicNumber = (buffer: ArrayBuffer): string | null => {
  const bytes = new Uint8Array(buffer);

  for (const mimeType in imageSignatures) {
    const signature = imageSignatures[mimeType]!;
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return mimeType; // Assinatura válida encontrada!
    }
  }

  return null; // Nenhuma assinatura correspondente
}

/**
 * Função principal assíncrona para validar o arquivo.
 */
export const isValidImage = async (file: File): Promise<boolean> => {
  // Leia apenas os primeiros 8 bytes (suficiente para a maioria das assinaturas)
  const slice = file.slice(0, 8);
  const buffer = await slice.arrayBuffer();

  const detectedType = checkMagicNumber(buffer);

  if (detectedType) {
    console.log(`Arquivo é uma imagem válida. Tipo detectado pelo conteúdo: ${detectedType}`);
    return true;
  } else {
    console.warn(`O arquivo não é uma imagem válida pelo seu conteúdo de bytes.`);
    return false;
  }
}
