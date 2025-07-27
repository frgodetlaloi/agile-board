# Agile Board Plugin pour Obsidian

Un plugin Obsidian permettant de créer des tableaux de bord personnalisés à partir de notes markdown avec des layouts prédéfinis.

## 🏗️ Architecture du Plugin

### Structure des Dossiers

```
src/
├── main.ts                    # Point d'entrée principal du plugin
├── types/                     # Définitions TypeScript
│   └── index.ts              # Types principaux (BoardSettings, BoardLayout, etc.)
├── services/                  # Services métier
│   ├── LayoutService.ts      # Gestion des layouts et modèles
│   └── FileService.ts        # Opérations sur les fichiers
├── views/                     # Vues personnalisées
│   └── BoardView.ts          # Vue principale du tableau de bord
├── managers/                  # Gestionnaires de fonctionnalités
│   ├── ViewSwitcher.ts       # Commutateur entre vue markdown et board
│   └── ModelDetector.ts      # Détection automatique des modèles
├── components/                # Composants réutilisables
│   └── MarkdownFrame.ts      # Frame éditable pour chaque section
├── utils/                     # Utilitaires
│   └── settings.ts           # Configuration par défaut
└── constants/                 # Constantes
    └── layouts.ts            # Définitions des layouts intégrés
```

## 🔧 Composants Principaux

### 1. **main.ts** - Plugin Principal

**Responsabilités :**
- Initialisation et configuration du plugin
- Orchestration des services et managers
- Enregistrement des commandes et vues
- Gestion du cycle de vie du plugin

**Points clés :**
- Hérite de la classe `Plugin` d'Obsidian
- Initialise tous les services dans `initializeServices()`
- Enregistre la vue custom `BoardView`
- Fournit des commandes pour créer différents types de boards

### 2. **BoardView.ts** - Vue Principale

**Responsabilités :**
- Affichage en mode "board" des notes markdown
- Création d'une grille CSS adaptative (24 colonnes)
- Gestion des frames éditables pour chaque section
- Interface utilisateur pour les erreurs (sections manquantes, etc.)

**Fonctionnalités :**
- Parsing automatique du frontmatter pour détecter le layout
- Création dynamique de frames basées sur le layout
- Édition en temps réel avec sauvegarde automatique
- Messages d'erreur interactifs avec boutons d'action

### 3. **LayoutService.ts** - Gestion des Layouts

**Responsabilités :**
- Chargement et gestion des layouts prédéfinis
- Fourniture d'API pour accéder aux modèles
- Mapping entre noms de layouts et configurations

**Layouts Intégrés :**
- **Eisenhower Matrix** : Gestion des priorités (4 quadrants)
- **Kanban Board** : Flux de travail (À faire, En cours, Terminé)
- **GTD Board** : Getting Things Done
- **Weekly/Daily Planner** : Planification temporelle
- **Project Board** : Gestion de projet
- **Cornell Notes** : Prise de notes structurée
- **Tasks Dashboard** : Tableau de bord des tâches

### 4. **FileService.ts** - Opérations Fichiers

**Responsabilités :**
- Parsing des sections markdown
- Création automatique de sections manquantes
- Manipulation du contenu des fichiers
- Validation de la structure des notes

**Fonctions principales :**
- `parseSections()` : Extrait les sections H1 d'un fichier
- `createMissingSections()` : Ajoute les sections requises par un layout
- `getMissingSections()` : Identifie les sections manquantes

### 5. **ViewSwitcher.ts** - Commutateur de Vues

**Responsabilités :**
- Ajout d'un bouton de basculement dans l'interface
- Détection du contexte (note avec layout agile-board)
- Basculement fluide entre vue markdown et board

### 6. **ModelDetector.ts** - Détection Automatique

**Responsabilités :**
- Surveillance des changements de fichiers actifs
- Mise à jour automatique de l'interface
- Gestion des événements Obsidian

### 7. **MarkdownFrame.ts** - Composant Éditable

**Responsabilités :**
- Affichage et édition d'une section markdown
- Synchronisation avec le fichier source
- Interface utilisateur pour l'édition inline

## 🎯 Flux de Données

### Initialisation
```
Plugin.onload() 
  → loadSettings() 
  → initializeServices() 
  → registerView(BoardView) 
  → initializeManagers()
```

### Affichage d'un Board
```
BoardView.onLoadFile() 
  → renderBoardLayout() 
  → FileService.parseSections() 
  → LayoutService.getModel() 
  → createFrames() 
  → MarkdownFrame instances
```

### Édition de Contenu
```
MarkdownFrame.onChange() 
  → BoardView.onFrameContentChanged() 
  → FileService update 
  → Vault.modify()
```

## 🔌 API Principales

### LayoutService
```typescript
class LayoutService {
  getModel(layoutName: string): BoardLayout[] | null
  getAllModelNames(): string[]
  getAllModelsInfo(): LayoutInfo[]
  getLayoutDisplayName(layoutName: string): string
}
```

### FileService
```typescript
class FileService {
  parseSections(file: TFile): Promise<SectionMap>
  createMissingSections(file: TFile, layout: BoardLayout[]): Promise<boolean>
  getMissingSections(existing: string[], required: string[]): string[]
}
```

### BoardView
```typescript
class BoardView extends FileView {
  renderBoardLayout(): Promise<void>
  getViewType(): string // 'agile-board-view'
  getDisplayText(): string
}
```

## 📋 Types Principaux

### BoardLayout
```typescript
interface BoardLayout {
  title: string;    // Nom de la section
  x: number;        // Position X dans la grille (0-23)
  y: number;        // Position Y dans la grille
  w: number;        // Largeur en colonnes
  h: number;        // Hauteur en lignes
}
```

### BoardSettings
```typescript
interface BoardSettings {
  defaultLayouts: string[];
  autoCreateSections: boolean;
  // ... autres paramètres
}
```

## 🚀 Commandes Disponibles

### Commandes de Création
- `create-eisenhower-note` : Crée une note Matrice d'Eisenhower
- `create-kanban-note` : Crée une note Kanban
- `create-gtd-note` : Crée une note GTD
- `create-weekly-note` : Crée un planificateur hebdomadaire
- `create-daily-note` : Crée un planificateur quotidien
- `create-project-note` : Crée un tableau de projet
- Et plus...

### Commandes Utilitaires
- `switch-to-board-view` : Bascule vers la vue board
- `list-layouts` : Affiche les layouts disponibles
- `create-missing-sections` : Crée les sections manquantes
- `force-update-buttons` : Met à jour les boutons manuellement

## 📝 Format des Notes

### Frontmatter Requis
```yaml
---
agile-board: layout_eisenhower
---
```

### Structure Markdown
```markdown
---
agile-board: layout_eisenhower
---

# Urgent et Important
Contenu de la section...

# Urgent mais Pas Important
Contenu de la section...

# Important mais Pas Urgent
Contenu de la section...

# Ni Urgent ni Important
Contenu de la section...
```

## 🛠️ Développement

### Prérequis
- Node.js 18+
- TypeScript
- Obsidian pour les tests

### Installation
```bash
npm install
```

### Build
```bash
# Développement avec watch
npm run dev

# Production
npm run build
```

### Structure du Build
- **Point d'entrée** : `src/main.ts`
- **Sortie** : `main.js` (bundle unique)
- **Bundler** : esbuild
- **Target** : ES2018

## 🎨 Styles CSS

Le plugin utilise les variables CSS natives d'Obsidian :
- `--background-primary`
- `--background-secondary`
- `--text-normal`
- `--text-muted`
- `--interactive-accent`
- `--background-modifier-border`

## 🐛 Debugging

### Logs Console
Le plugin utilise un système de logging coloré :
- 🚀 Initialisation
- ✅ Succès
- ❌ Erreurs
- 🔧 Opérations de maintenance
- 🎯 Navigation
- 📂 Fichiers

### Points de Debug Principaux
1. **main.ts** : `onload()` et `initializeServices()`
2. **BoardView.ts** : `renderBoardLayout()` et `createFrames()`
3. **FileService.ts** : `parseSections()` et `createMissingSections()`

## 🔄 Cycle de Vie

1. **Installation** : Plugin installé dans Obsidian
2. **Activation** : `onload()` appelé
3. **Utilisation** : Création/ouverture de notes avec layouts
4. **Basculement** : Entre vue markdown et board
5. **Désactivation** : `onunload()` pour le nettoyage

## 📚 Extensions Possibles

### Nouveaux Layouts
Ajouter dans `constants/layouts.ts` :
```typescript
export const CUSTOM_LAYOUT: BoardLayout[] = [
  { title: "Section 1", x: 0, y: 0, w: 12, h: 6 },
  { title: "Section 2", x: 12, y: 0, w: 12, h: 6 },
];
```

### Nouvelles Vues
Hériter de `FileView` ou `ItemView` selon les besoins.

### Nouveaux Services
Suivre le pattern des services existants avec injection du plugin principal.

---

## 📄 Licence

Ce plugin est développé pour Obsidian et suit les guidelines de développement de plugins Obsidian.