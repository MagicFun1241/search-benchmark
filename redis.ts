const redis = new Bun.RedisClient('redis://redis:6379');

import { readDataFile } from './generate';

export async function setupRedis() {
  console.log('Setting up redis...');

  console.log('Creating index...');
  await redis.send('FT.CREATE', ['users', 'PREFIX', '1', 'user:', 'SCHEMA', 'fullName', 'TEXT']);

  console.log('Inserting data...');
  await readDataFile(async (items) => {
    await Promise.all(items.map(async (item) => {
      await redis.hmset(`user:${item.id}`, Object.entries(item).map(([key, value]) => [key, String(value)]).flat());
    }));
  }, 1000);

  console.log('Redis setup complete');
}

let count = 0;

export async function benchmarkRedis(namePart: string) {
  const query = `@fullName:"${namePart.replaceAll('*', '').replaceAll('.', '')}"`;

  const result = await redis.send('FT.SEARCH', ['users', query, 'LIMIT', '0', '250']);

  count = (result.length - 1) / 2;
}

export function getCount() {
  return count;
}