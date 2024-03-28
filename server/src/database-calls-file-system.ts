import SharedLib from 'shared-lib';
const { TLSchemas } = SharedLib.schemaValidation;
import DatabaseCallsAbstractBlob from './database-calls-abstract-blob';
import BlobLocation from './database-calls-abstract-blob-types';
import logger from './logger';
import fs from 'fs';
import path from 'path';

export default class DatabaseCallsFileSystem extends DatabaseCallsAbstractBlob {
  dataDir: string;
  emailLookupDir: string;
  tokenLookupDir: string;
  publicIdLookupDir: string;
  blobMap: { [key: number]: string };

  constructor(rootDirectory: string) {
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

  async writeBlob(
    accountId: string,
    location: string,
    blobName: string,
    content: any,
    schemaToValidate: unknown,
    generation: string | null
  ) {
    // Map location to file
    const targetLocation = this.blobMap[location];
    // Validate schema before write
    if (schemaToValidate) {
      SharedLib.schemaValidation.validateSchema(content, schemaToValidate);
    }
    // Now write the actual file
    fs.writeFileSync(
      path.join(targetLocation, blobName),
      JSON.stringify(content, null, 2)
    );
  }

  async readBlob(
    accountId: string,
    location: string,
    blobName: string,
    schemaToValidate: unknown
  ) {
    // Map location to file
    const targetLocation = this.blobMap[location];
    // Now read the actual file
    const content = JSON.parse(
      fs.readFileSync(path.join(targetLocation, blobName)).toString()
    );

    // Schema validation for data blob. TODO: should we have JSON schema for all blobs, not just data?
    if (
      schemaToValidate === TLSchemas.FULL ||
      schemaToValidate === TLSchemas.CLIENT ||
      schemaToValidate === TLSchemas.EXPORT // I don't think we ever read EXPORT
    ) {
      const result = SharedLib.schemaMigration.updateSchema(
        accountId,
        content,
        SharedLib.schemaMigration.getMigration(schemaToValidate),
        logger
      );

      if (result === 'UPDATED') {
        // Check if a schema update is needed, if the schema has been upgraded, write the new data before progressing
        await this.writeBlob(
          accountId,
          location,
          blobName,
          content,
          schemaToValidate,
          null
        );
        logger.log(accountId, 'Updated schema write-back successful');
      }

      // Validate schema after read
      SharedLib.schemaValidation.validateSchema(content, schemaToValidate);
    }

    return {
      content: content,
      generation: undefined, // unused by this implementation
    };
  }

  async deleteBlob(accountId: string, location: string, blobName: string) {
    // Map location to file
    const targetLocation = this.blobMap[location];
    // Now delete the actual file
    fs.unlinkSync(path.join(targetLocation, blobName));
  }

  async exists(accountId: string, location: string, blobName: string) {
    // Map location to file
    const targetLocation = this.blobMap[location];
    // Now check if the file exists
    return fs.existsSync(path.join(targetLocation, blobName));
  }
}
