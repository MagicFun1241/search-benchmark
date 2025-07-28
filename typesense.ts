import { Client } from "typesense";
import { readDataFile } from "./generate";
import { sleep } from "bun";

const client = new Client({
  apiKey: 'testing',
  nodes: [
    {
      host: 'typesense',
      port: 8108,
      protocol: 'http',
    },
  ],
});

export async function setupTypesense() {
  console.log('Setting up typesense...');

  await sleep(1000*5);

  await client.collections().create({
    name: 'users',
    fields: [
      { name: 'id', type: 'int32' },
      { name: 'full_name', type: 'string' },
    ],
  });

  await readDataFile(async (items) => {
    await client.collections('users').documents().import(items.map((item) => ({
      id: String(item.id),
      full_name: item.fullName,
    })));
  }, 100000);
}

let count = 0;

export async function benchmarkTypesense(namePart: string) {
  const result = await client.collections('users').documents().search({
    q: namePart,
    query_by: 'full_name',
    limit: 250,
  });

  count = result.hits?.length ?? 0;
}

export function getCount() {
  return count;
}