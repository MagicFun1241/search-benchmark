import {Meilisearch} from "meilisearch";
import {readDataFile} from "./generate";

const client = new Meilisearch({
    host: 'http://meilisearch:7700',
    apiKey: 'testing',
});

export async function setupMeilisearch() {
    const index = client.index('users');

    console.log('Inserting data...');
    const promise: Promise<any>[] = []
    await readDataFile(async (items) => {
        promise.push(index.addDocuments(items).waitTask({timeout: 0}));
    }, 1000000);
    await Promise.all(promise);
}

let count = 0;

const index = client.index('users');

export async function benchmarkMeilisearch(namePart: string) {
    const result = await index.search(namePart, {limit: 250});

    count = result.hits.length;
}

export function getCount() {
    return count;
}