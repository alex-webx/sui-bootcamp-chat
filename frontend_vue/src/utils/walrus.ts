import { useConfig } from '../../configs';

const config = useConfig();

type WalrusPublishedResponse = {
  alreadyCertified: {
    blobId: string;
    endEpoch: number;
    event: {
      eventSeg: string;
      txDigest: string;
    };
  };
  newlyCreated: {
    blobObject: {
      blobId: string;
      certifiedEpoch: number;
      deletable: boolean;
      encodingType: 'RS2';
      id: string;
      registeredEpoch: number;
      size: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      },
    };
  };
};

export const uploadImage = async (file: File | ArrayBuffer) => {
  const url = `${config.getConfig('WalrusPublished')}/v1/blobs?permanent=true`;
  return fetch(url, {
    method: 'PUT', body: file
  }).then(async res => <WalrusPublishedResponse> await res.json());
};

export const getImageUrl = async (blobId: string) => `${config.getConfig('WalrusAggregator')}/v1/blobs/${blobId}`;

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64!);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const base64ToBlob = (b64Data: string, contentType: string = '', sliceSize: number = 512): Blob => {
  // Decodifica a string Base64 para uma string binária (caracteres ASCII)
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  // Processa a string binária em pedaços para eficiência
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    // Converte os números dos bytes em um Uint8Array
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  // Cria o Blob a partir dos Uint8Arrays montados
  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}
