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
  let validateSchema = ajv.getSchema(`http://softball.app/schemas/${schemaId}`);

  if (!validateSchema) {
    throw new Error('The specified schema does not exist: ' + schemaId);
  }

  const result = validateSchema(inputJson);
  if (result == true) {
    return { result: true };
  } else {
    return { result: false, errors: validateSchema.errors };
  }
};

let validateSchema = function (inputJson, schemaId) {
  let result = validateSchemaNoThrow(inputJson, schemaId);
  if (result.errors && result.length > 0) {
    throw new Error(
      'Encountered errors during document validation: ' +
        JSON.stringify(validateSchema.errors)
    );
  }
};

module.exports = module.exports = {
  validateSchema,
  validateSchemaNoThrow,
};
