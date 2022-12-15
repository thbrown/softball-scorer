import Ajv from 'ajv/dist/2020';
import * as schemaFull from '../schema-json/top-level-full.json';
import * as schemaClient from '../schema-json/top-level-client.json';
import * as schemaExport from '../schema-json/top-level-export.json';
import * as schemaPlayer from '../schema-json/player.json';
import * as schemaTeam from '../schema-json/team.json';
import * as schemaTeamReadOnly from '../schema-json/team-read-only.json';
import * as schemaGame from '../schema-json/game.json';
import * as schemaPlateAppearance from '../schema-json/plate-appearance.json';
import * as schemaOptimization from '../schema-json/optimization.json';
import * as schemaOptimizationReadOnly from '../schema-json/optimization-read-only.json';
import * as schemaAccount from '../schema-json/account.json';
import * as schemaAccountPrivate from '../schema-json/account-private.json';
import * as schemaAccountReadOnly from '../schema-json/account-read-only.json';
import * as jsonPointer from 'jsonpointer';

export const TLSchemas = {
  EXPORT: 'top-level-export',
  CLIENT: 'top-level-client',
  FULL: 'top-level-full',
};

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
    schemaOptimizationReadOnly,
    schemaAccount,
    schemaAccountPrivate,
    schemaAccountReadOnly,
  ],
});

export let validateSchemaNoThrow = function (inputJson, schemaId) {
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

export let validateSchema = function (inputJson, schemaId) {
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
        valueAtPath +
        ' of type ' +
        typeof valueAtPath;
    }

    throw new Error(errorMessage);
  }
};

export let convertDocumentToClient = function (inputJson) {
  if (inputJson.metadata.scope !== 'full') {
    throw new Error('Invalid inputJson ' + inputJson.metadata.scope);
  }

  inputJson.metadata.scope = 'client';

  // No private info in client
  delete inputJson.account.passwordHash;
  delete inputJson.account.passwordTokenHash;
  delete inputJson.account.passwordTokenExpiration;

  validateSchema(inputJson, TLSchemas.CLIENT);
  return inputJson;
};

export let convertDocumentToExport = function (inputJson) {
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

  // No optimizations
  delete inputJson.optimizations;

  validateSchema(inputJson, TLSchemas.EXPORT);
  return inputJson;
};

const exp = {
  validateSchema,
  validateSchemaNoThrow,
  convertDocumentToExport,
  convertDocumentToClient,
  TLSchemas,
};
export default exp;
