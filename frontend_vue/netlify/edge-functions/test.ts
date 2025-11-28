import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export const config = { path: '/hello' };

export default async () => {
  const client = new SuiClient({ url: getFullnodeUrl('devnet') });
  const obj = await client.getObject({ id: '0x76d2dab98844227b531d73d9a873138b1a34b31cd347a8993d880e72dd6b3d28'});
  return new Response(JSON.stringify(obj.data?.content), { headers: { 'Content-Type': 'application/json' } });
};
