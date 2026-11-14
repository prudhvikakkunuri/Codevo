import { INITIAL_WORKSPACE_FILES } from "@/data/workspace";

export const WORKSPACE_STORAGE_SCHEMA_VERSION = 1;
export const WORKSPACE_STORAGE_KEY_PREFIX = "codevo:workspace:v1";

export interface PersistedDocumentState {
  content: string;
  isModified: boolean;
}

export interface PersistedWorkspaceData {
  version: number;
  sessionId: string;
  updatedAt: number;
  documents: Record<string, PersistedDocumentState>;
  openFilePaths?: string[];
  activeFilePath?: string | null;
}

/**
 * Returns the isolated, versioned localStorage key for a workspace session.
 * e.g. "codevo:workspace:v1:ci-001-demo"
 */
export function getWorkspaceStorageKey(sessionId: string): string {
  const sanitized = sessionId.trim().toLowerCase();
  return `${WORKSPACE_STORAGE_KEY_PREFIX}:${sanitized}`;
}

/**
 * Validates parsed JSON data against the workspace schema.
 * Returns valid PersistedWorkspaceData or null if corrupted/incompatible.
 */
export function validatePersistedWorkspaceData(
  rawData: unknown,
  expectedSessionId: string
): PersistedWorkspaceData | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const data = rawData as Record<string, unknown>;

  // Validate version
  if (data.version !== WORKSPACE_STORAGE_SCHEMA_VERSION) {
    return null;
  }

  // Validate session ID matches
  if (typeof data.sessionId !== "string" || data.sessionId.trim().toLowerCase() !== expectedSessionId.trim().toLowerCase()) {
    return null;
  }

  // Validate documents map
  if (!data.documents || typeof data.documents !== "object" || Array.isArray(data.documents)) {
    return null;
  }

  const rawDocs = data.documents as Record<string, unknown>;
  const validatedDocuments: Record<string, PersistedDocumentState> = {};

  for (const [path, doc] of Object.entries(rawDocs)) {
    if (
      doc &&
      typeof doc === "object" &&
      !Array.isArray(doc) &&
      typeof (doc as Record<string, unknown>).content === "string" &&
      typeof (doc as Record<string, unknown>).isModified === "boolean"
    ) {
      validatedDocuments[path] = {
        content: (doc as Record<string, unknown>).content as string,
        isModified: (doc as Record<string, unknown>).isModified as boolean,
      };
    }
  }

  // Validate openFilePaths if present
  let validatedOpenFilePaths: string[] | undefined = undefined;
  if (Array.isArray(data.openFilePaths)) {
    const validPaths = data.openFilePaths.filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0
    );
    if (validPaths.length > 0) {
      validatedOpenFilePaths = validPaths;
    }
  }

  // Validate activeFilePath if present
  let validatedActiveFilePath: string | null | undefined = undefined;
  if (data.activeFilePath === null || typeof data.activeFilePath === "string") {
    validatedActiveFilePath = data.activeFilePath;
  }

  const updatedAt = typeof data.updatedAt === "number" ? data.updatedAt : Date.now();

  return {
    version: WORKSPACE_STORAGE_SCHEMA_VERSION,
    sessionId: expectedSessionId,
    updatedAt,
    documents: validatedDocuments,
    openFilePaths: validatedOpenFilePaths,
    activeFilePath: validatedActiveFilePath,
  };
}

/**
 * Loads and validates persisted workspace state for a session from localStorage.
 * Returns null if not found, malformed, or storage is inaccessible.
 */
export function loadWorkspaceState(sessionId: string): PersistedWorkspaceData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const key = getWorkspaceStorageKey(sessionId);
    const item = window.localStorage.getItem(key);
    if (!item) {
      return null;
    }

    const parsed = JSON.parse(item);
    return validatePersistedWorkspaceData(parsed, sessionId);
  } catch (error) {
    console.warn(`[Codevo] Failed to load persisted workspace state for session "${sessionId}":`, error);
    return null;
  }
}

/**
 * Persists complete workspace state for a session to localStorage.
 * Handles storage quota limits and security restrictions gracefully.
 */
export function saveWorkspaceState(
  sessionId: string,
  state: {
    documents: Record<string, PersistedDocumentState>;
    openFilePaths?: string[];
    activeFilePath?: string | null;
  }
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Reject saving any workspace state if the session has already been submitted and locked
  try {
    const subKey = `codevo:submission:v1:${sessionId.trim().toLowerCase()}`;
    if (window.localStorage.getItem(subKey)) {
      console.warn(`[Codevo] Save rejected: workspace session "${sessionId}" is submitted and locked.`);
      return false;
    }
  } catch {
    // ignore storage access errors
  }

  try {
    const key = getWorkspaceStorageKey(sessionId);
    const payload: PersistedWorkspaceData = {
      version: WORKSPACE_STORAGE_SCHEMA_VERSION,
      sessionId,
      updatedAt: Date.now(),
      documents: state.documents,
      openFilePaths: state.openFilePaths,
      activeFilePath: state.activeFilePath,
    };

    window.localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (
      typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      console.warn(`[Codevo] LocalStorage quota exceeded for workspace session "${sessionId}". Modifications retained in memory only.`);
    } else {
      console.warn(`[Codevo] Storage write failed for workspace session "${sessionId}":`, error);
    }
    return false;
  }
}

/**
 * Clears persisted workspace state for a session.
 */
export function clearWorkspaceState(sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getWorkspaceStorageKey(sessionId);
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Codevo] Failed to clear workspace state for session "${sessionId}":`, error);
  }
}

/**
 * Reconciles persisted documents with starter files.
 * Guarantees that all starter files exist in the returned dictionary,
 * overlaying any persisted modifications.
 */
export function reconcileWorkspaceDocuments(
  persistedDocs?: Record<string, PersistedDocumentState>
): Record<string, PersistedDocumentState> {
  const result: Record<string, PersistedDocumentState> = {};

  // 1. Seed with starter files
  for (const [path, file] of Object.entries(INITIAL_WORKSPACE_FILES)) {
    result[path] = {
      content: file.content,
      isModified: false,
    };
  }

  // 2. Overlay persisted modifications
  if (persistedDocs) {
    for (const [path, doc] of Object.entries(persistedDocs)) {
      result[path] = {
        content: doc.content,
        isModified: doc.isModified,
      };
    }
  }

  return result;
}

export interface WorkspaceInitialState {
  documents: Record<string, PersistedDocumentState>;
  openFilePaths: string[];
  activeFilePath: string | null;
}

/**
 * Retrieves the initial workspace state for a session.
 * On the client, synchronously restores persisted state if valid data exists.
 * Falls back to canonical starter files on the server or for fresh sessions.
 */
export function getInitialWorkspaceState(sessionId: string): WorkspaceInitialState {
  if (typeof window !== "undefined") {
    // Check if session was submitted with an immutable snapshot
    try {
      const subKey = `codevo:submission:v1:${sessionId.trim().toLowerCase()}`;
      const subRaw = window.localStorage.getItem(subKey);
      if (subRaw) {
        const subRecord = JSON.parse(subRaw);
        if (subRecord && subRecord.submittedDocuments) {
          const reconciled = reconcileWorkspaceDocuments(subRecord.submittedDocuments);
          const openPaths = [
            "app/services/authentication.py",
            "tests/test_auth.py",
            "app/routes/auth.py",
          ];
          return {
            documents: reconciled,
            openFilePaths: openPaths,
            activeFilePath: openPaths[0] ?? null,
          };
        }
      }
    } catch {
      // fallback to regular load
    }

    const persisted = loadWorkspaceState(sessionId);
    if (persisted) {
      const reconciled = reconcileWorkspaceDocuments(persisted.documents);
      let openPaths = [
        "app/services/authentication.py",
        "tests/test_auth.py",
        "app/routes/auth.py",
      ];
      if (persisted.openFilePaths && persisted.openFilePaths.length > 0) {
        const valid = persisted.openFilePaths.filter(
          (p) => INITIAL_WORKSPACE_FILES[p] || reconciled[p]
        );
        if (valid.length > 0) {
          openPaths = valid;
        }
      }

      const activePath =
        persisted.activeFilePath !== undefined ? persisted.activeFilePath : (openPaths[0] ?? null);

      return {
        documents: reconciled,
        openFilePaths: openPaths,
        activeFilePath: activePath,
      };
    }
  }

  // Fallback canonical starter state
  const initialDocs: Record<string, PersistedDocumentState> = {};
  for (const [path, file] of Object.entries(INITIAL_WORKSPACE_FILES)) {
    initialDocs[path] = { content: file.content, isModified: false };
  }

  return {
    documents: initialDocs,
    openFilePaths: [
      "app/services/authentication.py",
      "tests/test_auth.py",
      "app/routes/auth.py",
    ],
    activeFilePath: "app/services/authentication.py",
  };
}
