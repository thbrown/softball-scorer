export class LsMigrationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class LsSchemaVersionError extends Error {
  constructor(message: string) {
    super(message);
  }
}
