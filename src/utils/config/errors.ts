export class ConfigVersionTooNewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigVersionTooNewError"
  }
}

export class ConfigMigrationFailedError extends Error {
  constructor(
    message: string,
    readonly invalidPaths: string[] = [],
  ) {
    super(message)
    this.name = "ConfigMigrationFailedError"
  }
}
