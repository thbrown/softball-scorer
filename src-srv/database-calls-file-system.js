const DatabaseCallsAbstractBlob = require('./database-calls-abstract-blob');
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const SharedLib = require('../shared-lib').default;
const logger = require('./logger.js');

const fs = require('fs');
const path = require('path');

let databaseCallsFileSystem = class DatabaseCallsFileSystem extends DatabaseCallsAbstractBlob {
  constructor(rootDirectory) {
    super();
    // Make the root directory (if it doesn't exist)
    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory);
    }

    // Make data directory (if it doesn't exist)
    this.dataDir = path.join(rootDirectory, 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir);
    }

    // Make email-lookup directory (if it doesn't exist)
    this.emailLookupDir = path.join(rootDirectory, 'email-lookup');
    if (!fs.existsSync(this.emailLookupDir)) {
      fs.mkdirSync(this.emailLookupDir);
    }

    // Make token-lookup directory (if it doesn't exist)
    this.tokenLookupDir = path.join(rootDirectory, 'token-lookup');
    if (!fs.existsSync(this.tokenLookupDir)) {
      fs.mkdirSync(this.tokenLookupDir);
    }

    // Make public-id-lookup directory (if it doesn't exist)
    this.publicIdLookupDir = path.join(rootDirectory, 'public-id-lookup');
    if (!fs.existsSync(this.publicIdLookupDir)) {
      fs.mkdirSync(this.publicIdLookupDir);
    }

    // Create a lookup table for these locations
    this.blobMap = {};
    this.blobMap[BlobLocation.DATA] = this.dataDir;
    this.blobMap[BlobLocation.EMAIL_LOOKUP] = this.emailLookupDir;
    this.blobMap[BlobLocation.TOKEN_LOOKUP] = this.tokenLookupDir;
    this.blobMap[BlobLocation.PUBLIC_ID_LOOKUP] = this.publicIdLookupDir;
  }

  async writeBlob(accountId, location, blobName, content, generation) {
    // Map location to file
    let targetLocation = this.blobMap[location];
    // Validate schema before write
    if (location === BlobLocation.DATA) {
      SharedLib.schemaValidation.validateSchema(content, 'top-level-full');
    }
    // Now write the actual file
    fs.writeFileSync(
      path.join(targetLocation, blobName),
      JSON.stringify(content, null, 2)
    );
  }

  async readBlob(accountId, location, blobName) {
    // Map location to file
    let targetLocation = this.blobMap[location];
    // Now read the actual file
    let content = JSON.parse(
      fs.readFileSync(path.join(targetLocation, blobName))
    );

    // Schema validation for data blob. TODO: should we have JSON schema for all blobs, not just data?
    if (location === BlobLocation.DATA) {
      let result = SharedLib.schemaMigration.updateSchema(
        accountId,
        content,
        'full',
        logger
      );

      if (result === 'UPDATED') {
        // Check if a schema update is needed, if the schema has been upgraded, write the new data before progressing
        await this.writeBlob(accountId, location, blobName, content, null);
        logger.log(accountId, 'Updated schema write-back successful');
      }

      // Validate schema after read
      SharedLib.schemaValidation.validateSchema(content, 'top-level-full');
    }

    return {
      content: content,
      generation: undefined, // unused by this implementation
    };
  }

  async deleteBlob(accountId, location, blobName) {
    // Map location to file
    let targetLocation = this.blobMap[location];
    // Now delete the actual file
    fs.unlinkSync(path.join(targetLocation, blobName));
  }

  async exists(accountId, location, blobName) {
    // Map location to file
    let targetLocation = this.blobMap[location];
    // Now check if the file exists
    return fs.existsSync(path.join(targetLocation, blobName));
  }
};
module.exports = databaseCallsFileSystem;
