const redis = new Bun.RedisClient('redis://redis:6379');

const dragonflyOld = new Bun.RedisClient('redis://dragonfly_old:6379');
const dragonflyNew = new Bun.RedisClient('redis://dragonfly_new:6379');

import { readDataFile } from './generate';

export async function setupDragonflyOld() {
  return setupRedisLike(dragonflyOld);
}

  export async function setupDragonflyNew() {
  return setupRedisLike(dragonflyNew);
}

export async function setupRedis() {
  return setupRedisLike(redis);
}

export async function setupRedisLike(connection: Bun.RedisClient) {
  console.log('Setting up redis...');

  console.log('Creating index...');
  await connection.send('FT.CREATE', ['users', 'PREFIX', '1', 'user:', 'SCHEMA', 'fullName', 'TEXT', 'WEIGHT', '1.0']);

  console.log('Inserting data...');
  await readDataFile(async (items) => {
    await Promise.all(items.map(async (item) => {
      await connection.hmset(`user:${item.id}`, Object.entries(item).map(([key, value]) => [key, String(value)]).flat());
    }));
  }, 1000);

  console.log('Redis setup complete');
}

let redisCount = 0;

function escapeQuery(query: string) {
  return query.replaceAll('*', '').replaceAll('.', '');
}

export async function benchmarkRedis(namePart: string) {
  const query = `"${escapeQuery(namePart)}"`;

  const result = await redis.send('FT.SEARCH', ['users', query, 'LIMIT', '0', '250']);

  // Redis FT.SEARCH returns [total_count, [doc1, score1, doc2, score2, ...]]
  // So the first element is the total count of matching documents
  if (Array.isArray(result) && result.length > 0) {
    redisCount += (result.length - 1) / 2;
  } else if (result != null && result.results?.length > 0) {
    redisCount += result.results.length;
  }
}

export function getRedisCount() {
  return redisCount;
}

let dragonflyOldCount = 0;

export async function benchmarkDragonflyOld(namePart: string) {
  const query = `"${escapeQuery(namePart)}"`;

  const result = await dragonflyOld.send('FT.SEARCH', ['users', query, 'LIMIT', '0', '250']);
  
  // Dragonfly FT.SEARCH returns [total_count, [doc1, score1, doc2, score2, ...]]
  if (Array.isArray(result) && result.length > 0) {
    dragonflyOldCount += (result.length - 1) / 2;
  } else if (result != null && result.results?.length > 0) {
    dragonflyOldCount += result.results.length;
  }
}

export function getDragonflyOldCount() {
  return dragonflyOldCount;
}

let dragonflyNewCount = 0;

export async function benchmarkDragonflyNew(namePart: string) {
  const query = `"${escapeQuery(namePart)}"`;

  const result = await dragonflyNew.send('FT.SEARCH', ['users', query, 'LIMIT', '0', '250']);
  
  // Dragonfly FT.SEARCH returns [total_count, [doc1, score1, doc2, score2, ...]]
  if (Array.isArray(result) && result.length > 0) {
    dragonflyNewCount += (result.length - 1) / 2;
  } else if (result != null && result.results?.length > 0) {
    dragonflyNewCount += result.results.length;
  }
}

export function getDragonflyNewCount() {
  return dragonflyNewCount;
}