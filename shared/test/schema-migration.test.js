let fs = require('fs');
const SharedLib = require('../../shared-lib').default;
const Ajv = require('ajv/dist/2020');

describe('migration', () => {
  test('Migration and schema validation', async () => {
    // Get out-dated JSON data from the file system
    let content = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Update the schema
    let result = SharedLib.schemaMigration.updateSchema(
      null,
      content,
      'export'
    );

    console.log('Schema validation result', result);
    if (result !== 'UPDATED') {
      throw new Error(
        `Schema validation did not complete with the expected status. Status was: ${result} expected 'UPDATED'`
      );
    }

    // Now validate the schema
    SharedLib.schemaValidation.validateSchema(content, 'top-level-export');
  });
});
