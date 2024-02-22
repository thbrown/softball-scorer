import SharedLib from 'shared-lib';
const TLSchemas = SharedLib.schemaValidation.TLSchemas;
import logger from './logger';
import fs from 'fs';
import path from 'path';

const gcpOps = class GcpOps {
  static async writeBlob(
    accountId: string,
    targetBucket: any,
    blobName: string,
    content: any,
    schemaToValidate: any,
    generation: string | null,
    retry?: number
  ) {
    try {
      // Validate schema before write
      if (schemaToValidate) {
        SharedLib.schemaValidation.validateSchema(content, schemaToValidate);
      }

      // Now write the actual file
      const file = targetBucket.file(blobName);
      await file.save(JSON.stringify(content), {
        generation: generation,
        validation: 'md5',
        resumable: false,
        metadata: {
          cacheControl: 'no-cache',
        },
      });
    } catch (e) {
      // These error codes mean that the content written to the bucket has a different checksum than the file that was uploaded.
      // It's really bad for us because the file either gets deleted to preserve data integrity (FILE_NO_UPLOAD) or the file
      // fails to get delete and we get potentially corrupted data (FILE_NO_UPLOAD_DELETE). So we will re-try and if that
      // doesn't work, we will dump the write content to the file system so we can restore it manually later. This is not an
      // API error so it's not covered by the Storage library's automatic retry.
      if (
        (retry ?? 0) <= 0 &&
        (e.code === 'FILE_NO_UPLOAD' || e.code === 'FILE_NO_UPLOAD_DELETE')
      ) {
        logger.error(
          accountId,
          'Write checksum did not match. Attempting re-try.'
        );
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await GcpOps.writeBlob(
            accountId,
            location,
            blobName,
            content,
            schemaToValidate,
            generation,
            (retry ?? 0) + 1
          );
        } catch (e) {
          // Something is still wrong, dump the file to the file system
          const stack = new Error().stack;
          logger.error(
            accountId,
            'BAD: write checksum did not match and retry failed. File to restore has been persisted to file system.',
            stack,
            targetBucket.name,
            blobName,
            content.length
          );
          // Save the file to the local file system for manual restoration
          fs.writeFileSync(
            path.join(
              __dirname,
              `/emergency-dump-${targetBucket.name}-${blobName}.json`
            ),
            JSON.stringify(content)
          );
          throw e;
        }
      }

      // Storage library does not give a good stack, print the one we care about here
      const stack = new Error().stack;
      logger.error(
        accountId,
        'Write Error',
        stack,
        targetBucket.name,
        blobName,
        content.length
      );
      throw e;
    }
  }

  static async readBlob(
    accountId: string,
    targetBucket: any,
    blobName: string,
    schemaToValidate: any
  ) {
    try {
      // Read the file content
      let fileContent;
      let generation;
      try {
        const file = (await targetBucket.file(blobName).get())[0];
        generation = file.metadata.generation;
        fileContent = JSON.parse(
          await file.download({
            validation: 'md5',
          })
        );
      } catch (e) {
        // Caller checks fof 404
        logger.error('Error reading blob', e);
        throw e;
      }

      // Schema validation for data blob.
      if (
        schemaToValidate === TLSchemas.FULL ||
        schemaToValidate === TLSchemas.CLIENT ||
        schemaToValidate === TLSchemas.EXPORT // I don't think we ever read EXPORT
      ) {
        const result = SharedLib.schemaMigration.updateSchema(
          accountId,
          fileContent,
          SharedLib.schemaMigration.getMigration(schemaToValidate),
          logger
        );

        if (result === 'UPDATED') {
          // If the schema has been updated, write the new data before progressing
          await GcpOps.writeBlob(
            accountId,
            targetBucket,
            blobName,
            fileContent,
            schemaToValidate,
            generation
          );
          logger.log(accountId, 'Updated schema write-back successful');
        }

        // Validate schema after read
        SharedLib.schemaValidation.validateSchema(
          fileContent,
          schemaToValidate
        );
      }

      return {
        content: fileContent,
        generation: generation,
      };
    } catch (e) {
      // Storage library does not give a good stack, print the one we care about here
      const stack = new Error().stack;
      if (e.code !== 404) {
        logger.error(
          accountId,
          'Read Error',
          targetBucket.name,
          blobName,
          stack
        );
      } else {
        logger.warn(
          accountId,
          'Read Error - 404 - this may be okay if this is a new login',
          targetBucket.name,
          blobName,
          stack
        );
      }
      throw e;
    }
  }

  static async deleteBlob(
    accountId: string,
    targetBucket: any,
    blobName: string
  ) {
    try {
      // Now delete the actual file
      const file = targetBucket.file(blobName);
      await file.delete();
    } catch (e) {
      if (e.code === 404) {
        return; // Already deleted, or never existed
      }
      logger.error(accountId, 'Error on delete');
      throw e;
    }
  }

  static async exists(
    accountId: string,
    targetBucket: any,
    blobName: string
  ): Promise<boolean> {
    try {
      // Now delete the actual file
      const file = targetBucket.file(blobName);
      const result = await file.exists();
      return result[0];
    } catch (e) {
      logger.log(accountId, 'Error on delete');
      throw e;
    }
  }
};
export default gcpOps;
