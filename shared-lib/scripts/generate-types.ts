import { compileFromFile } from 'json-schema-to-typescript';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaRelDir = path.resolve(__dirname, '../schema-json-relative');
const outputDir = path.resolve(__dirname, '../types');

function changeExtensionToTs(filename: string) {
  const nameWithoutExtension = path.parse(filename).name;
  const newFilename = `${nameWithoutExtension}.ts`;
  return newFilename;
}

async function copySchemaFiles(filePaths: string[]) {
  for (const file of filePaths) {
    const fileContents = fs.readFileSync(file, 'utf8');
    const replacedContents = fileContents.replace(
      /http:\/\/softball\.app\/schemas\/([\w-]+)/g,
      schemaRelDir + '/$1.json'
    );
    const replaceFile = path.resolve(schemaRelDir, path.basename(file));
    fs.writeFileSync(replaceFile, replacedContents);
  }
}

async function compileFile(file: string) {
  console.log(`Compile: ${file}`);
  return compileFromFile(file)
    .then((ts) => {
      return ts;
    })
    .catch((err) => {
      console.error(`Error compiling file ${file}: ${err}`);
      return '';
    });
}

async function iterateFilesInDirectory(
  directoryPath: string
): Promise<string[]> {
  const entries = await fs.promises.readdir(directoryPath);
  const filePaths: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry);
    const stats = await fs.promises.stat(fullPath);

    if (stats.isDirectory()) {
      filePaths.push(...(await iterateFilesInDirectory(fullPath)));
    } else {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

const main = async () => {
  const inputJsonFiles = await iterateFilesInDirectory(
    path.resolve(__dirname, '../schema-json/')
  );
  console.log('inputJsonFiles', inputJsonFiles);
  await copySchemaFiles(inputJsonFiles);
  for (const file of inputJsonFiles) {
    const newFile = file.replace('schema-json', 'schema-json-relative');
    const ts = await compileFile(newFile);
    fs.writeFileSync(
      outputDir + '/' + path.basename(newFile).slice(0, -5) + '.ts',
      ts
    );
  }
  console.log('done');
};
main();
