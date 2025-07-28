import { generateDataFile } from './generate';
import { benchmarkDragonfly, benchmarkRedis, setupDragonfly, setupRedis } from './redis';
import { benchmarkParadedb, getCount as getCountParadedb, setupParadedb } from './paradedb';
import { benchmarkMeilisearch, getCount as getCountMeilisearch, setupMeilisearch } from './meilisearch';
import { benchmarkTypesense, getCount as getCountTypesense, setupTypesense } from './typesense';

// const bench = new Bench({name: 'benchmark'});
// bench.concurrency = 'task'
// bench.threshold = 10

console.log('Starting benchmark...');

console.log('Setting up providers...');

const { names } = await generateDataFile();

const enabledProviders = ['dragonfly', 'redis', 'paradedb', 'meilisearch', 'typesense'];
const tasks = [
  enabledProviders.includes('dragonfly') && setupDragonfly(),
  enabledProviders.includes('redis') && setupRedis(),
  enabledProviders.includes('paradedb') && setupParadedb(),
  enabledProviders.includes('meilisearch') && setupMeilisearch(),
  enabledProviders.includes('typesense') && setupTypesense(),
].filter(Boolean)

await Promise.all(tasks)

const generateRandomId = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

type Options = {
  names: string[],
  workers: number,
};

type BenchmarkResults = {
  errors: number,
  timePerRequest: {
    sum: number,
    count: number,
    max: number,
    min: number,
    all: number[],
  },
  duration: number,
}

async function performBenchmarkTarget(options: Options, results: BenchmarkResults, target: (namePart: string) => Promise<void>) {
  const state = {
    index: 0,
    isReady: false
  }

  const worker = async () => {
    while (true) {
      const index = state.index++;
      const name = options.names[index];
      if (!name) {
        console.log("Worker exited")
        return;
      }

      try {
        const start = performance.now();
        await target(name);
        const end = performance.now();

        const timeTaken = end - start;
        results.timePerRequest.sum += timeTaken;
        results.timePerRequest.count++;
        results.timePerRequest.all.push(timeTaken);
        results.timePerRequest.max = Math.max(results.timePerRequest.max, timeTaken);
        results.timePerRequest.min = Math.min(results.timePerRequest.min, timeTaken);
      } catch (e) {
        results.errors++;
      }
    }
  }

  const startedAt = Date.now();

  ; (async () => {
    while (!state.isReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const progress = (state.index / options.names.length * 100).toFixed(2);
      const remaining = options.names.length - state.index;
      const elapsed = Date.now() - startedAt;
      const remainingTime = (elapsed / state.index) * remaining;
      console.log(`Progress: ${progress}% | ETA: ${Math.floor(remainingTime / 1000).toFixed(1)} seconds | Processed: ${state.index}/${options.names.length} names`);
    }
    console.log('Worker is ready');
  })();

  const start = Date.now();
  const tasks = <Promise<void>[]>[];
  for (let i = 0; i < options.workers; i++) {
    tasks.push(worker());
  }
  await Promise.all(tasks)
  const end = Date.now();

  state.isReady = true;

  results.duration = end - start;

  return results
}


async function performBenchmark(options: Options) {
  const { workers } = options;
  console.log(` Benchmarking: workers=${workers}`);

  const targets = {
    typesense: benchmarkTypesense,
    paradedb: benchmarkParadedb,
    meilisearch: benchmarkMeilisearch,
    redis: benchmarkRedis,
    dragonfly: benchmarkDragonfly,
  }

  const results: Record<keyof typeof targets, BenchmarkResults> = Object.fromEntries(Object.keys(targets).map(name => [
    name,
    {
      timePerRequest: {
        sum: 0,
        count: 0,
        max: -Infinity,
        min: Infinity,
        all: [],
      },
      duration: 0
    }
  ])) as any

  for (const [name, target] of Object.entries(targets)) {
    if (!enabledProviders.includes(name)) {
      continue;
    }
    console.log(` Benchmarking ${name}...`);
    // @ts-ignore
    results[name] = await performBenchmarkTarget(options, results[name], target);
  }

  console.log('Benchmark results:');
  for (const [name, result] of Object.entries(results)) {
    if (result.timePerRequest.count === 0) {
      console.log(` ${name}: No requests processed`);
      continue;
    }
    
    const avgTime = result.timePerRequest.sum / result.timePerRequest.count;
    const sorted = result.timePerRequest.all.sort((a, b) => a - b);
    const medianTime = sorted[Math.floor(result.timePerRequest.all.length / 2)]!;
    const p99Time = sorted[Math.floor(result.timePerRequest.all.length * 0.99)]!;
    const p95Time = sorted[Math.floor(result.timePerRequest.all.length * 0.95)]!;
    const p90Time = sorted[Math.floor(result.timePerRequest.all.length * 0.9)]!;
    const p75Time = sorted[Math.floor(result.timePerRequest.all.length * 0.75)]!;
    const p50Time = sorted[Math.floor(result.timePerRequest.all.length * 0.5)]!;

    console.log(` ${name}: ${avgTime.toFixed(2)} ms per request, ${result.timePerRequest.count} requests processed`);
    console.log(`  - Median: ${medianTime.toFixed(2)} ms`);
    console.log(`  - P99: ${p99Time.toFixed(2)} ms`);
    console.log(`  - P95: ${p95Time.toFixed(2)} ms`);
    console.log(`  - P90: ${p90Time.toFixed(2)} ms`);
    console.log(`  - P75: ${p75Time.toFixed(2)} ms`);
    console.log(`  - P50: ${p50Time.toFixed(2)} ms`);
    console.log(`  Duration: ${result.duration} ms`);
    console.log(`  Requests per second: ${(result.timePerRequest.count / (result.duration / 1000)).toFixed(2)}`);
    console.log(`  Errors: ${result.errors}`);
  }
}

console.log(`Generating benchmark names... (${names.length})`);

const bmNames = []
for (let i = 0; i < 500_000; i++) {
  if (Math.random() < 0.1) {
    bmNames.push(generateRandomId(5 + Math.random() * 64));
  } else {
    let name = names[Math.floor(Math.random() * names.length)];
    if (name === undefined) {
      console.warn('Name is undefined, skipping...');
      process.exit(1)
    }
    bmNames.push(name!);
  }
}

await performBenchmark({
  names: bmNames,
  workers: 64,
});

if (enabledProviders.includes('paradedb')) {
  console.log('Paradedb', getCountParadedb());
}

if (enabledProviders.includes('meilisearch')) {
  console.log('Meilisearch', getCountMeilisearch());
}

if (enabledProviders.includes('typesense')) {
  console.log('Typesense', getCountTypesense());
}