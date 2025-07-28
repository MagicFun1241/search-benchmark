import {sql} from 'bun';
import {readDataFile} from './generate';

export async function setupParadedb() {
    console.log('Setting up paradedb...');

    console.log('Creating table...');
    await sql`
        CREATE TABLE users
        (
            id        SERIAL PRIMARY KEY,
            full_name TEXT NOT NULL
        );
    `;

    console.log('Inserting data...');
    await readDataFile(async (items) => {
        await sql`INSERT INTO users ${sql(items.map((item) => ({id: item.id, full_name: item.fullName})))}`;
    }, 1000);

    console.log('Creating index...');
    await sql`
        CREATE INDEX search_idx ON users
            USING bm25 (id, full_name)
            WITH (key_field='id');
    `;

    console.log('Paradedb setup complete');
}

let count = 0;

export async function benchmarkParadedb(namePart: string) {
    const result = await sql`SELECT *
                             FROM users
                             WHERE full_name @@@ ${namePart} LIMIT 250`;

    count = result.length;
}

export function getCount() {
    return count;
}