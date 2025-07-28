import { faker } from '@faker-js/faker';

export interface User {
  id: number;
  fullName: string;
}

export async function generateDataFile() {
  try {
    await Bun.file('config/data.json').delete();
  } catch (error) {
    console.log('No data file found, creating new one');
  }

  await Bun.file('config/data.json').write("");

  const writer = Bun.file('config/data.json').writer();

  let fullName = '';

  const half = 1000000 / 2;

  // 1 000 000 users (one million)
  for (let i = 0; i < 1000000; i++) {
    const item: User = {
      id: i,
      fullName: faker.person.fullName(),
    };

    if (i === half) {
      fullName = item.fullName;
    }

    writer.write(JSON.stringify(item) + '\n');
  }

  await writer.end();

  return {
    namePart: fullName.split(' ')[0]!,
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
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

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