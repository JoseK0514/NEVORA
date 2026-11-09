export class WorkspaceUnavailableError extends Error {
  constructor() { super('Workspace configuration is unavailable.'); }
}

export class WorkspaceInactiveError extends WorkspaceUnavailableError {}
