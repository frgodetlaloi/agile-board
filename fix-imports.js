const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des imports pour structure racine...');

// Fonction pour corriger les imports dans un fichier
function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Corriger l'import du plugin principal (enlever ../main)
  if (content.includes("import type AgileBoardPlugin from '../main'")) {
    content = content.replace(
      /import type AgileBoardPlugin from ['"]\.\.\/main['"];/g,
      "import type AgileBoardPlugin from './main';"
    );
    modified = true;
  }
  
  // Corriger les imports des types (enlever ./types)
  if (content.includes("from './types'")) {
    content = content.replace(
      /from ['"]\.\/types['"];/g,
      "from './types';"
    );
    modified = true;
  }
  
  // Corriger les imports relatifs des services/managers/etc
  content = content.replace(/from ['"]\.\.\/services\//g, "from './services/");
  content = content.replace(/from ['"]\.\.\/managers\//g, "from './managers/");
  content = content.replace(/from ['"]\.\.\/views\//g, "from './views/");
  content = content.replace(/from ['"]\.\.\/components\//g, "from './components/");
  content = content.replace(/from ['"]\.\.\/settings\//g, "from './settings/");
  content = content.replace(/from ['"]\.\.\/commands\//g, "from './commands/");
  
  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  }
}

// Corriger tous les fichiers TypeScript dans les sous-dossiers
const foldersToCheck = ['commands', 'managers', 'views', 'services', 'settings', 'components'];

foldersToCheck.forEach(folder => {
  if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder).filter(file => file.endsWith('.ts'));
    files.forEach(file => {
      fixImportsInFile(path.join(folder, file));
    });
  }
});

// Correction spécifique pour BoardView.ts
const boardViewPath = 'views/BoardView.ts';
if (fs.existsSync(boardViewPath)) {
  let content = fs.readFileSync(boardViewPath, 'utf8');
  
  // Rendre frames public
  if (content.includes('private frames = new Map')) {
    content = content.replace(
      /private frames = new Map/g,
      'public frames = new Map'
    );
    console.log('✅ frames rendu public dans BoardView');
  }
  
  // Corriger le this.file! 
  if (content.includes('this.file,')) {
    content = content.replace(
      /this\.file,/g,
      'this.file!,'
    );
    console.log('✅ this.file! corrigé dans BoardView');
  }
  
  fs.writeFileSync(boardViewPath, content);
}

// Créer un main.ts simplifié
const mainTsContent = `import { Plugin } from 'obsidian';
import { BoardSettings } from './types';

const DEFAULT_SETTINGS: BoardSettings = {
  defaultModel: 'layout_eisenhower',
  autoSwitchEnabled: true,
  debounceDelay: 1000
};

export default class AgileBoardPlugin extends Plugin {
  settings!: BoardSettings;

  async onload(): Promise<void> {
    console.log('🚀 Loading Agile Board Plugin...');
    await this.loadSettings();
    console.log('✅ Agile Board Plugin loaded successfully');
  }

  async onunload(): Promise<void> {
    console.log('🛑 Unloading Agile Board Plugin...');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
`;

// Créer main.ts seulement s'il n'existe pas
if (!fs.existsSync('main.ts')) {
  fs.writeFileSync('main.ts', mainTsContent);
  console.log('✅ main.ts créé');
}

console.log('🎉 Corrections terminées!');
console.log('📝 Prochaines étapes:');
console.log('   1. npm install');
console.log('   2. npm run build');