import { Meilisearch } from "meilisearch";
import { readDataFile } from "./generate";

const client = new Meilisearch({
  host: 'http://meilisearch:7700',
  apiKey: 'testing',
});

export async function setupMeilisearch() {
  const index = client.index('users');

  console.log('Inserting data...');
  await readDataFile(async (items) => {
    await index.addDocuments(items).waitTask();
  }, 10000);
}

let count = 0;

const index = client.index('users');

export async function benchmarkMeilisearch(namePart: string) {
  const result = await index.search(namePart, { limit: 250 });

  count = result.hits.length;
}

export function getCount() {
  return count;
}