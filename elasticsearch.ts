import { Client, HttpConnection } from '@elastic/elasticsearch';
import { readDataFile } from './generate';

import { sleep } from 'bun';

// Initialize Elasticsearch client
const client = new Client({
  node: 'http://elasticsearch:9200',
  auth: {
    username: 'elastic',
    password: 'bitnami',
  },
  Connection: HttpConnection,
});

const INDEX_NAME = 'users';

export async function setupElasticsearch() {
  await sleep(30 * 1000);

  try {
    // Check if index exists, if not create it
    const indexExists = await client.indices.exists({ index: INDEX_NAME });

    if (!indexExists) {
      console.log('Creating Elasticsearch index...');
      await client.indices.create({
        index: INDEX_NAME
      });
    }

    // Clear existing data
    await client.deleteByQuery({
      index: INDEX_NAME,
      query: {
        match_all: {}
      }
    });

    console.log('Inserting data into Elasticsearch...');

    await readDataFile(async (items) => {
      const dataset = items.map(item => ({
        id: item.id.toString(),
        fullName: item.fullName,
      }));

      const operations = dataset.flatMap(doc => [{ index: { _index: INDEX_NAME } }, doc])

      await client.bulk({
        refresh: false,
        operations,
      });
    }, 100000);

    // Refresh index to make documents searchable
    await client.indices.refresh({ index: INDEX_NAME });

    console.log('Elasticsearch setup completed');
  } catch (error) {
    console.error('Error setting up Elasticsearch:', error);
    throw error;
  }
}

let count = 0;

export async function benchmarkElasticsearch(namePart: string) {
  try {
    const result = await client.search({
      index: INDEX_NAME,
      query: {
        match: {
          fullName: namePart
        }
      },
      size: 250
    });

    count += result.hits.hits.length;
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    throw error;
  }
}

export function getCount() {
  return count;
}

// Health check function
export async function checkElasticsearchHealth() {
  try {
    const health = await client.cluster.health();
    return health;
  } catch (error) {
    console.error('Elasticsearch health check failed:', error);
    throw error;
  }
}

// Get index statistics
export async function getIndexStats() {
  try {
    const stats = await client.indices.stats({ index: INDEX_NAME });
    return stats;
  } catch (error) {
    console.error('Failed to get index stats:', error);
    throw error;
  }
}
