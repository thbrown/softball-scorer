let fs = require('fs');
const schemaValidation = require('../../shared-lib').default.schemaValidation;
const schemaMigration = require('../../shared-lib').default.schemaMigration;

let deepCopy = function (input) {
  return JSON.parse(JSON.stringify(input));
};

describe('migration', () => {
  test('Migration and schema validation', async () => {
    // Get out-dated JSON data from the file system
    let content = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Update the schema
    let result = schemaMigration.updateSchema(null, content, 'export');

    console.log('Schema validation result', result);
    if (result !== 'UPDATED') {
      throw new Error(
        `Schema validation did not complete with the expected status. Status was: ${result} expected 'UPDATED'`
      );
    }

    // Now validate the schema
    schemaValidation.validateSchema(content, 'top-level-export');
  });
});

describe('Validation', () => {
  test('Account must not contain extra properties', async () => {
    let document = {
      teams: [],
      players: [],
      optimizations: [],
      account: {
        accountId: '2dfOnqaAA9u',
        email: 'thbrownmines@gmail.com',
        optimizers: [0],
        balance: 0,
        emailConfirmed: false,
        passwordHash:
          '$2b$12$L9EYLkwNbj74/bepPVtx6ul.PHFJn1X8yq9vqvEK645bWzXeXfD5K',
        passwordTokenHash: '+SFXlUEV5AfOpJRgt4+xOMlSGF9bjaCN36ZP5FApLxY=',
        passwordTokenExpiration: 1667433742243,
      },
      metadata: { version: 1, scope: 'full' },
    };
    schemaValidation.validateSchema(document, 'top-level-full');
  });

  test('Account must not contain extra properties', async () => {
    // Get old schema document and update.
    let stringContent = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Full
    let content = deepCopy(stringContent);
    content.account.rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'full');
    let r = schemaValidation.validateSchemaNoThrow(content, 'top-level-full');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Client
    content = deepCopy(stringContent);
    content.account.rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'client');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-client');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Export (doesn't contain account)
  });

  test('Optimization must not contain extra properties', async () => {
    // Get old schema document and update.
    let stringContent = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Full
    let content = deepCopy(stringContent);
    content.optimizations[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'full');
    let r = schemaValidation.validateSchemaNoThrow(content, 'top-level-full');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Client
    content = deepCopy(stringContent);
    content.optimizations[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'client');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-client');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Export
    content = deepCopy(stringContent);
    content.optimizations[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'export');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-export');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');
  });

  test('Team must not contain extra properties', async () => {
    // Get old schema document and update.
    let stringContent = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Full
    let content = deepCopy(stringContent);
    content.teams[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'full');
    let r = schemaValidation.validateSchemaNoThrow(content, 'top-level-full');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Client
    content = deepCopy(stringContent);
    content.teams[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'client');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-client');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Export
    content = deepCopy(stringContent);
    content.teams[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'export');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-export');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');
  });

  test('Game must not contain extra properties', async () => {
    // Get old schema document and update.
    let stringContent = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Full
    let content = deepCopy(stringContent);
    content.teams[0].games[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'full');
    let r = schemaValidation.validateSchemaNoThrow(content, 'top-level-full');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Client
    content = deepCopy(stringContent);
    content.teams[0].games[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'client');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-client');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Export
    content = deepCopy(stringContent);
    content.teams[0].games[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'export');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-export');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');
  });

  test('PlateAppearances must not contain extra properties', async () => {
    // Get old schema document and update.
    let stringContent = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );

    // Full
    let content = deepCopy(stringContent);
    content.teams[0].games[0].plateAppearances[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'full');
    let r = schemaValidation.validateSchemaNoThrow(content, 'top-level-full');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Client
    content = deepCopy(stringContent);
    content.teams[0].games[0].plateAppearances[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'client');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-client');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');

    // Export
    content = deepCopy(stringContent);
    content.teams[0].games[0].plateAppearances[0].rubbish = 1238789450;
    schemaMigration.updateSchema(null, content, 'export');
    r = schemaValidation.validateSchemaNoThrow(content, 'top-level-export');
    expect(r.result).toEqual(false);
    expect(r.errors[0].message).toEqual('must NOT have unevaluated properties');
  });
});

describe('Conversion', () => {
  test('Convert full to client', async () => {
    // Get old schema document and update.
    let content = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );
    schemaMigration.updateSchema(null, content, 'full');
    schemaValidation.validateSchema(content, 'top-level-full');
    schemaValidation.convertDocumentToClient(content);
  });

  test('Convert full to export', async () => {
    // Get old schema document and update.
    let content = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );
    schemaMigration.updateSchema(null, content, 'full');
    schemaValidation.validateSchema(content, 'top-level-full');
    schemaValidation.convertDocumentToExport(content);
  });

  test('Convert client to export', async () => {
    // Get old schema document and update.
    let content = JSON.parse(
      fs.readFileSync(__dirname + '/data/migration-test-data.json')
    );
    schemaMigration.updateSchema(null, content, 'client');
    schemaValidation.validateSchema(content, 'top-level-client');
    schemaValidation.convertDocumentToExport(content);
  });
});
