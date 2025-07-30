/**
 * Configuration globale des tests pour Agile Board
 * Mocks et helpers pour l'environnement de test
 */

// Configuration des timeouts
jest.setTimeout(10000);

// Helper pour créer un mock App Obsidian
export const createMockApp = () => {
  return {
    workspace: {
      getActiveFile: jest.fn(),
      getAllFiles: jest.fn(),
      activeLeaf: {
        view: {
          getViewType: jest.fn(() => 'markdown')
        }
      },
      getLeavesOfType: jest.fn(() => []),
      setActiveLeaf: jest.fn(),
      on: jest.fn(),
      iterateAllLeaves: jest.fn()
    },
    vault: {
      read: jest.fn(),
      modify: jest.fn(),
      create: jest.fn(),
      getMarkdownFiles: jest.fn(() => []),
      getAbstractFileByPath: jest.fn(),
      adapter: {
        exists: jest.fn(),
        read: jest.fn(),
        write: jest.fn()
      }
    },
    metadataCache: {
      getFileCache: jest.fn(),
      on: jest.fn()
    }
  };
};

// Helper pour créer un mock TFile
// (avec vault et parent)
export const createMockTFile = (path: string, basename?: string) => {
  const mockVault = {
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    adapter: {
      exists: jest.fn(),
      read: jest.fn(),
      write: jest.fn()
    }
  };

  const mockParent = {
    path: path.substring(0, path.lastIndexOf('/')) || '/',
    name: path.substring(0, path.lastIndexOf('/')).split('/').pop() || '',
    children: []
  };

  return {
    path,
    name: basename || path.split('/').pop() || '',
    basename: (basename || path.split('/').pop() || '').replace(/\.[^/.]+$/, ''),
    extension: 'md',
    stat: {
      mtime: Date.now(),
      ctime: Date.now(),
      size: 100
    },
    vault: mockVault,
    parent: mockParent,
    unsafeCachedData: '',
    deleted: false
  } as any;
};

// Helper pour créer un mock Plugin
export const createMockPlugin = () => {
  return {
    app: createMockApp(),
    addCommand: jest.fn(),
    registerEvent: jest.fn(),
    registerView: jest.fn(),
    loadData: jest.fn(() => Promise.resolve({})),
    saveData: jest.fn(() => Promise.resolve()),
    addSettingTab: jest.fn(),
    registerInterval: jest.fn()
  };
};

// Mock des settings par défaut
export const createMockSettings = () => {
  return {
    autoCreateSections: true,
    defaultLayouts: ['layout_kanban', 'layout_eisenhower'],
    debug: {
      enabled: false,
      logLevel: 2, // INFO
      logToFile: false,
      logToConsole: true,
      showTimestamps: true,
      showSourceLocation: true,
      logFileName: 'test-debug.log',
      maxLogFileSize: 1024
    }
  };
};

// Cleanup après chaque test
afterEach(() => {
  jest.clearAllMocks();
});