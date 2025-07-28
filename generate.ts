import {faker} from '@faker-js/faker';
import {reverseString} from "es-toolkit";

export interface User {
    id: number;
    fullName: string;
}

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

const operations: Array<(name: string) => string> = [
    it => reverseString(it),
    (it) => {
        const shuffleAt = Math.random() * it.length;
        const firstPart = it.slice(0, shuffleAt);
        const secondPart = it.slice(shuffleAt);
        return secondPart + firstPart;
    },
    (it) => {
        const randomLater = random(letters)
        const randomIndex = Math.floor(Math.random() * it.length);
        return it.slice(0, randomIndex) + randomLater + it.slice(randomIndex);
    },
    (it) => {
        const randomIndex = Math.floor(Math.random() * it.length);
        return it.slice(0, randomIndex) + it.slice(randomIndex).toUpperCase();
    },
]

function obfuscateName(name: string): string {
    const operationCount = Math.random() * 10;
    if (operationCount === 0) {
        return name;
    }

    let obfuscatedName = name;
    for (let i = 0; i < operationCount; i++) {
        const operation = random(operations);
        obfuscatedName = operation(obfuscatedName);
    }
    return obfuscatedName;
}

export async function generateDataFile() {
    try {
        await Bun.file('config/data.json').delete();
    } catch (error) {
        console.log('No data file found, creating new one');
    }

    await Bun.file('config/data.json').write("");

    const writer = Bun.file('config/data.json').writer();

    const names = new Set<string>();

    const users = 5_000_000;

    for (let i = 0; i < users; i++) {
        const generatedName = faker.person.fullName();

        const nameParts = generatedName.split(' ');
        for (let j = 0; j < nameParts.length; j++) {
            nameParts[j] = obfuscateName(nameParts[j]!);
        }

        const item: User = {
            id: i,
            fullName: nameParts.join(' '),
        };

        names.add(nameParts[0]!);

        writer.write(JSON.stringify(item) + '\n');
    }

    await writer.end();

    return {
        names: [...names],
    };
}

export async function readDataFile(
    callback: (items: User[], startIndex: number) => Promise<void>,
    batchSize: number = 100
) {
    const stream = Bun.file('config/data.json').stream();
    const reader = stream.getReader();

    const decoder = new TextDecoder();

    let buffer = '';
    let index = 0;
    let currentBatch: User[] = [];

    while (true) {
        const {value, done} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});

        let lines = buffer.split('\n');
        buffer = lines.pop()!; // Save the last (possibly incomplete) line

        for (const line of lines) {
            index++;

            try {
                const item: User = JSON.parse(line);
                currentBatch.push(item);

                // Process batch when it reaches the specified size
                if (currentBatch.length >= batchSize) {
                    await callback(currentBatch, index - currentBatch.length + 1);

                    if (index % 10000 === 0) {
                        console.log(`Processed ${index} users`);
                    }

                    currentBatch = [];
                }
            } catch (error) {
                console.log(`Error parsing item: ${line}`);
                break;
            }
        }
    }

    // Process any remaining items in the final batch
    if (currentBatch.length > 0) {
        await callback(currentBatch, index - currentBatch.length + 1);
        console.log(`Processed final batch of ${currentBatch.length} users (total: ${index})`);
    }
}