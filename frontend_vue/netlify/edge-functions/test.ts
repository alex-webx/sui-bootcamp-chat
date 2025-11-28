export default () => new Response('Hello World');

export const config = { path: '/hello' };

// import type { Context } from 'netlify:edge';
// import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// export const handler = async (req: Request, context: Context) => {

//   const client = new SuiClient({ url: getFullnodeUrl('devnet') });

//   const obj = await client.getObject({ id: '0x76d2dab98844227b531d73d9a873138b1a34b31cd347a8993d880e72dd6b3d28'});

//   return new Response(obj, context.next());
// };
