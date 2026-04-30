import type { APIRoute } from 'astro';
import { getDataSource } from '@/lib/data-source';

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ ok: true, dataSource: getDataSource(), version: '0.1.0' }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    },
  );
};
