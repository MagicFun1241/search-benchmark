const redis = new Bun.RedisClient('redis://redis:6379');

const dragonfly = new Bun.RedisClient('redis://dragonfly:6379');

import { readDataFile } from './generate';

export async function setupDragonfly() {
  return setupRedisLike(dragonfly);
}

export async function setupRedis() {
  return setupRedisLike(redis);
}

export async function setupRedisLike(connection: Bun.RedisClient) {
  console.log('Setting up redis...');

  console.log('Creating index...');
  await connection.send('FT.CREATE', ['users', 'PREFIX', '1', 'user:', 'SCHEMA', 'fullName', 'TEXT']);

  console.log('Inserting data...');
  await readDataFile(async (items) => {
    await Promise.all(items.map(async (item) => {
      await connection.hmset(`user:${item.id}`, Object.entries(item).map(([key, value]) => [key, String(value)]).flat());
    }));
  }, 1000);

  console.log('Redis setup complete');
}

let count = 0;

export async function benchmarkRedis(connection: Bun.RedisClient, namePart: string) {
  const query = `@fullName:"${namePart.replaceAll('*', '').replaceAll('.', '')}"`;

  const result = await connection.send('FT.SEARCH', ['users', query, 'LIMIT', '0', '250']);

  count = (result.length - 1) / 2;
}

export function getCount() {
  return count;
}