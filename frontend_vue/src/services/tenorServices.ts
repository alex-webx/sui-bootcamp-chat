import Config, { getAllConfigs } from '../../configs';

export type TenorFileType = 'gifpreview' | 'loopedmp4' | 'nanomp4' | 'tinywebm' | 'mediumgif' | 'webm' | 'nanogifpreview' | 'tinymp4' | 'mp4' | 'nanogif' | 'nanowebm' | 'tinygif' | 'gif' | 'tinygifpreview' | 'webp';
export type TenorResult = {
  id: string;
  title: string;
  media_formats: {
    [type in TenorFileType]: {
      url: string;
      duration: number;
      preview: string;
      dims: number[];
      size: number;
    };
  };
  created: number;
  content_description: string;
  itemurl: string;
  url: string;
  tags: string[];
  flags: any[];
  hasaudio: boolean;
  content_description_source: string;
};
export type TenorResponse = {
  next: string;
  results: TenorResult[]
};

export function useTenorServices() {
  const tenorApiKey = Config('TenorApiKey');
  const tenorClientKey = Config('TenorClientKey');

  const getTrendingTerm = async () => {
    const trendingUrl = `https://tenor.googleapis.com/v2/trending_terms?key=${tenorApiKey}&client_key=${tenorClientKey}&country=BR&locale=pt_BR&limit=1`;
    return fetch(trendingUrl).then(res => res.json()).then(json => json.results[0] as string);
  }

  const searchGif = async (text: string | null, limit: number, cursor: string | null = null) => {
    const url = `https://tenor.googleapis.com/v2/search?`;

    if (!text) {
      text = await getTrendingTerm();
    }

    const query = [
      `q=${text}`,
      `key=${tenorApiKey}`,
      `client_key=${tenorClientKey}`,
      `limit=${limit}`,
      `media_filter=mp4,nanomp4,tinymp4,loopedmp4`,
      'country=BR',
      'locale=pt_BR'
    ];

    if (cursor) { query.push(`pos=${cursor}`); }

    return await fetch(`${url}${query.join('&')}`)
      .then(res => res.json())
      .then(json => json as TenorResponse);
  };

  return {
    searchGif
  };
}
