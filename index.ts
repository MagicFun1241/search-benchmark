import { Bench } from 'tinybench';

import { generateDataFile } from './generate';
import { benchmarkRedis, getCount as getCountRedis, setupRedis } from './redis';
import { benchmarkParadedb, getCount as getCountParadedb, setupParadedb } from './paradedb';
import { benchmarkMeilisearch, getCount as getCountMeilisearch, setupMeilisearch } from './meilisearch';
import { benchmarkTypesense, getCount as getCountTypesense, setupTypesense } from './typesense';

const bench = new Bench({ name: 'benchmark' });

console.log('Starting benchmark...');

console.log('Setting up providers...');

const { namePart } = await generateDataFile();

const enabledProviders = ['redis', 'paradedb', 'meilisearch', 'typesense'];

if (enabledProviders.includes('redis')) {
  await setupRedis();
}

if (enabledProviders.includes('paradedb')) {
  await setupParadedb();
}

if (enabledProviders.includes('meilisearch')) {
  await setupMeilisearch();
}

if (enabledProviders.includes('typesense')) {
  await setupTypesense();
}

console.log('Running benchmark...');
if (enabledProviders.includes('redis')) {
  bench.add('redis', () => benchmarkRedis(namePart));
}

if (enabledProviders.includes('paradedb')) {
  bench.add('paradedb', () => benchmarkParadedb(namePart));
}

if (enabledProviders.includes('meilisearch')) {
  bench.add('meilisearch', () => benchmarkMeilisearch(namePart));
}

if (enabledProviders.includes('typesense')) {
  bench.add('typesense', () => benchmarkTypesense(namePart));
}

await bench.run();

if (enabledProviders.includes('redis')) {
  console.log('Redis', getCountRedis());
}

if (enabledProviders.includes('paradedb')) {
  console.log('Paradedb', getCountParadedb());
}

if (enabledProviders.includes('meilisearch')) {
  console.log('Meilisearch', getCountMeilisearch());
}

if (enabledProviders.includes('typesense')) {
  console.log('Typesense', getCountTypesense());
}

console.log(`Results for "${bench.name}" with query "${namePart}":`);
console.table(bench.table());