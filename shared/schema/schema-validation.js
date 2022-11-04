import Ajv from 'ajv/dist/2020';
import * as schemaFull from './top-level-full.json';
import * as schemaClient from './top-level-client.json';
import * as schemaExport from './top-level-export.json';
import * as schemaPlayer from './player.json';
import * as schemaTeam from './team.json';
import * as schemaTeamReadOnly from './team-read-only.json';
import * as schemaGame from './game.json';
import * as schemaPlateAppearance from './plate-appearance.json';
import * as schemaOptimization from './optimization.json';
import * as schemaAccount from './account.json';
import * as schemaAccountPrivate from './account-private.json';
import * as schemaAccountReadOnly from './account-read-only.json';
import * as jsonPointer from 'jsonPointer';

const ajv = new Ajv({
  allowUnionTypes: true,
  schemas: [
    schemaFull,
    schemaClient,
    schemaExport,
    schemaPlayer,
    schemaTeam,
    schemaTeamReadOnly,
    schemaGame,
    schemaPlateAppearance,
    schemaOptimization,
    schemaAccount,
    schemaAccountPrivate,
    schemaAccountReadOnly,
  ],
});

let validateSchemaNoThrow = function (inputJson, schemaId) {
  let validateSchemaObj = ajv.getSchema(
    `http://softball.app/schemas/${schemaId}`
  );

  if (!validateSchemaObj) {
    throw new Error('The specified schema does not exist: ' + schemaId);
  }

  const result = validateSchemaObj(inputJson);
  if (result == true) {
    return { result: true };
  } else {
    return { result: false, errors: validateSchemaObj.errors };
  }
};

let validateSchema = function (inputJson, schemaId) {
  let result = validateSchemaNoThrow(inputJson, schemaId);
  if (result.errors && result.errors.length > 0) {
    console.log('Validation result', result);
    let errorMessage = `Encountered errors during validation on schema ${schemaId}:`;

    // Adding the value at instancePath helps a lot in debugging
    for (let error of result.errors) {
      let path = error.instancePath;
      let valueAtPath = jsonPointer.get(inputJson, path);
      errorMessage =
        errorMessage +
        '\n' +
        JSON.stringify(error, null, 2) +
        '\nValue at instancePath: ' +
        valueAtPath;
    }

    throw new Error(errorMessage);
  }
};

let convertDocumentToClient = function (inputJson) {
  if (inputJson.metadata.scope !== 'full') {
    throw new Error('Invalid inputJson ' + inputJson.metadata.scope);
  }

  inputJson.metadata.scope = 'client';

  // No private info in client
  delete inputJson.account.passwordHash;
  delete inputJson.account.passwordTokenHash;
  delete inputJson.account.passwordTokenExpiration;

  validateSchema(inputJson, 'top-level-client');
  return inputJson;
};

let convertDocumentToExport = function (inputJson) {
  if (
    inputJson.metadata.scope !== 'full' &&
    inputJson.metadata.scope !== 'client'
  ) {
    throw new Error('Invalid inputJson ' + inputJson.metadata.scope);
  }

  inputJson.metadata.scope = 'export';

  // No read-only fields in team
  for (let team of inputJson.teams) {
    delete team.publicId;
    delete team.publicIdEnabled;
  }

  // No account info at all in export
  delete inputJson.account;

  validateSchema(inputJson, 'top-level-export');
  return inputJson;
};

module.exports = module.exports = {
  validateSchema,
  validateSchemaNoThrow,
  convertDocumentToExport,
  convertDocumentToClient,
};
