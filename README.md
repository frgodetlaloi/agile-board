# Agile Board Plugin pour Obsidian v0.9.0

Un plugin Obsidian avancé permettant de créer des tableaux de bord personnalisés à partir de notes markdown avec des layouts prédéfinis et un support universel des plugins.

## ✨ Nouvelles Fonctionnalités v0.9.0

### 🔌 Support Universel des Plugins
- **Intégration native** avec le plugin Tasks d'Obsidian
- **Support Dataview** pour les requêtes et tableaux
- **Rendu natif** utilisant le moteur d'Obsidian
- **Détection automatique** des plugins installés
- **Gestion des états de tâches** avancée (Tasks plugin)

### 📊 Système de Logging Optimisé
- **Logs centralisés** avec sauvegarde automatique
- **Buffer intelligent** avec gestion de la mémoire
- **Niveaux de log** configurables
- **Export vers fichier** avec rotation automatique
- **Diagnostics intégrés** pour le débogage

### 🏗️ Architecture Améliorée
- **ServiceContainer** avec injection de dépendances
- **PluginIntegrationManager** pour l'intégration universelle
- **Optimisation environnement** automatique
- **Gestion d'erreurs** robuste

## 🏗️ Architecture du Plugin

### Structure des Dossiers

```
src/
├── main.ts                         # Point d'entrée principal v0.9.0
├── types/                          # Définitions TypeScript
│   └── index.ts                   # Types principaux (BoardSettings, LogStats, etc.)
├── services/                       # Services métier
│   ├── ServiceContainer.ts        # Container d'injection de dépendances
│   ├── LoggerService.ts           # Service de logging centralisé
│   ├── PluginIntegrationManager.ts # Gestionnaire universel des plugins
│   ├── LayoutService.ts           # Gestion des layouts et modèles
│   └── FileService.ts             # Opérations sur les fichiers
├── views/                          # Vues personnalisées
│   └── BoardView.ts               # Vue principale du tableau de bord
├── managers/                       # Gestionnaires de fonctionnalités
│   ├── ViewSwitcher.ts            # Commutateur entre vue markdown et board
│   └── ModelDetector.ts           # Détection automatique des modèles
├── components/                     # Composants réutilisables
│   ├── MarkdownFrame.ts           # Frame éditable pour chaque section
│   └── SettingsTab.ts             # Interface de configuration
├── utils/                          # Utilitaires
│   ├── settings.ts                # Configuration avec support plugins
│   ├── validation.ts              # Validation des données
│   └── errorHandler.ts            # Gestionnaire d'erreurs
├── cache/                          # Système de cache
│   └── FileCache.ts               # Cache intelligent des fichiers
├── constants/                      # Constantes
│   ├── layouts.ts                 # Définitions des layouts intégrés
│   └── parsing.ts                 # Constantes de parsing
└── errors/                         # Gestion d'erreurs
    └── AgileBoardError.ts         # Classes d'erreur personnalisées
```

## 🔧 Composants Principaux

### 1. **main.ts** - Plugin Principal v0.9.0

**Nouvelles responsabilités :**
- Initialisation avec support universel des plugins
- Optimisation automatique selon l'environnement
- Gestion des diagnostics et debug des plugins
- Nettoyage avancé des vues lors du rechargement

**Points clés :**
- Support universel activé par défaut
- Détection automatique des plugins Obsidian
- Commandes avancées pour le debug
- API publique étendue pour l'intégration

### 2. **ServiceContainer.ts** - Conteneur de Services

**Responsabilités :**
- Injection de dépendances centralisée
- Gestion du cycle de vie des services
- Initialisation du PluginIntegrationManager
- Statistiques et monitoring

### 3. **PluginIntegrationManager.ts** - Intégration Universelle

**Responsabilités :**
- Support natif du plugin Tasks avec états avancés
- Conversion intelligente HTML → Markdown
- Gestion des événements de plugins tiers
- Fallbacks pour plugins récalcitrants
- Préservation des métadonnées (dates, priorités, tags)

**Plugins supportés :**
- **Tasks** : Gestion complète des états de tâches
- **Dataview** : Requêtes et tableaux
- **Kanban** : Tableaux kanban
- **Calendar** : Événements et dates
- **Templater** : Templates avancés

### 4. **LoggerService.ts** - Logging Centralisé

**Responsabilités :**
- Buffer intelligent avec limitation mémoire
- Sauvegarde automatique avec rotation
- Niveaux de log configurables (ERROR, WARN, INFO, DEBUG, VERBOSE)
- Formatage intelligent des objets complexes
- Statistiques détaillées

### 5. **BoardView.ts** - Vue Principale

**Améliorations :**
- Rendu natif utilisant le moteur d'Obsidian
- Intégration transparente avec les plugins
- Gestion des erreurs améliorée
- Support des liens et références natives

### 6. **MarkdownFrame.ts** - Composant Éditable

**Nouvelles fonctionnalités :**
- Support universel des plugins dans les frames
- Extraction intelligente du contenu modifié
- Synchronisation bidirectionnelle avec les plugins
- Gestion des métadonnées de plugins tiers

## 🎯 Flux de Données v0.9.0

### Initialisation Avancée
```
Plugin.onload() 
  → initializeCore()
    → optimizeSettingsForEnvironment()
    → LoggerService + ServiceContainer
  → initializeServices()
    → PluginIntegrationManager
    → ViewSwitcher + ModelDetector
  → initializeUI()
    → registerView avec nettoyage intelligent
    → commandes avancées
```

### Support Universel des Plugins
```
PluginIntegrationManager.setupUniversalPluginSupport()
  → setupMutationObserver() (surveillance DOM)
  → setupEventDelegation() (délégation d'événements)
  → setupTasksSpecificSupport() (support Tasks)
  → setupContextCorrection() (correction contexte)
  → applyPluginFallbacks() (fallbacks intelligents)
```

### Édition avec Plugins
```
User interaction → Plugin traite nativement
  → MutationObserver détecte changements
  → PluginIntegrationManager extrait contenu
  → Conversion HTML → Markdown intelligente
  → BoardView met à jour le fichier
  → Synchronisation avec Vault
```

## 🔌 API Principales

### ServiceContainer
```typescript
class ServiceContainer {
  initialize(): Promise<void>
  updateSettings(settings: BoardSettings): void
  dispose(): void
  getStats(): Record<string, unknown>
}
```

### PluginIntegrationManager
```typescript
class PluginIntegrationManager {
  setupUniversalPluginSupport(container: HTMLElement, 
    onContentChange: (content: string) => void, 
    sourcePath: string): void
  extractCurrentContentPublic(container: HTMLElement): string | null
  isPluginElement(element: HTMLElement): boolean
  dispose(): void
  getStats(): { observers: number; eventListeners: number }
}
```

### LoggerService
```typescript
class LoggerService {
  error(message: string, error?: any, source?: string): void
  warn(message: string, data?: any, source?: string): void
  info(message: string, data?: any, source?: string): void
  debug(message: string, data?: any, source?: string): void
  verbose(message: string, data?: any, source?: string): void
  
  // Méthodes spécialisées
  startup(message: string, data?: any): void
  success(message: string, data?: any, source?: string): void
  config(message: string, data?: any): void
  navigation(message: string, data?: any): void
  fileOperation(message: string, data?: any): void
  
  // Gestion
  saveLogsToFile(): Promise<void>
  getStats(): LogStats
  clearBuffer(): void
}
```

## 📋 Types Principaux

### BoardSettings (Étendu)
```typescript
interface BoardSettings {
  defaultLayouts: string[];
  autoCreateSections: boolean;
  debug: DebugSettings;
  // ✅ NOUVEAU : Support des plugins
  pluginSupport: {
    enabled: boolean;
    debugMode: boolean;
    supportedPlugins: string[];
    loadTimeout: number;
    fallbackDelay: number;
  };
}
```

### LogStats
```typescript
interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  debugCount: number;
  lastLogTime: string;
  bufferSize: number;
  isEnabled: boolean;
  currentLevel: string;
  fileLoggingEnabled: boolean;
}
```

## 🚀 Commandes Disponibles

### Commandes de Création (Inchangées)
- `create-eisenhower-note` : Crée une note Matrice d'Eisenhower
- `create-kanban-note` : Crée une note Kanban
- `create-gtd-note` : Crée une note GTD
- Etc.

### ✅ Nouvelles Commandes v0.9.0
- `refresh-plugin-support` : Actualise le support des plugins
- `toggle-plugin-debug` : Bascule le debug des plugins
- `show-plugin-diagnostics` : Affiche les diagnostics détaillés

### Commandes Utilitaires
- `switch-to-board-view` : Bascule vers la vue board
- `create-missing-sections` : Crée les sections manquantes

## 📝 Format des Notes avec Support Plugins

### Frontmatter Requis
```yaml
---
agile-board: layout_eisenhower
---
```

### Structure avec Support Tasks
```markdown
---
agile-board: layout_eisenhower
---

# Urgent et Important
- [x] Tâche terminée avec date ✅ 2024-12-20
- [ ] Tâche en cours avec échéance 📅 2024-12-25
- [!] Tâche importante ⏫ haute priorité

# Urgent mais Pas Important
```dataview
TASK
WHERE due < date(today)
GROUP BY file.folder
```

# Important mais Pas Urgent
```tasks
not done
due after today
sort by due
```

# Ni Urgent ni Important
- [ ] Lecture optionnelle #développement
- [ ] Veille technologique 🛫 2024-12-30
```

## 🛠️ Développement

### Prérequis
- Node.js 18+
- TypeScript 4.7+
- Obsidian pour les tests

### Installation
```bash
npm install
```

### Build
```bash
# Développement avec watch
npm run dev

# Production optimisée
npm run build
```

### Tests
```bash
# Tous les tests
npm run test

# Tests avec watch
npm run test:watch

# Coverage
npm run test:coverage

# Tests spécifiques
npm run test:services
npm run test:components
```

## 🎨 Styles CSS

Le plugin utilise les variables CSS natives d'Obsidian et ajoute :

### Classes spécifiques aux plugins
- `.agile-board-container` : Container principal
- `.plugin-integration-active` : Indicateur d'intégration active
- `.tasks-enhanced` : Support Tasks activé
- `.dataview-enhanced` : Support Dataview activé

## 🐛 Debugging v0.9.0

### Système de Logs Avancé
```typescript
// Logs console colorés
🚀 Démarrage    ✅ Succès      ❌ Erreurs
⚠️ Avertissements  ℹ️ Info    🔧 Debug
🔍 Verbose      ⚙️ Config     🧭 Navigation
📁 Fichiers     📊 Stats      🔌 Plugins
```

### Commandes de Diagnostic
1. **Palette de commandes** → "Agile Board: Afficher les diagnostics des plugins"
2. **Console développeur** : F12 → Console
3. **Fichier de logs** : `agile-board-debug.log` dans le vault

### Configuration Debug
```javascript
// Dans les paramètres du plugin
{
  "debug": {
    "enabled": true,
    "logLevel": 4, // VERBOSE
    "logToFile": true,
    "logToConsole": true,
    "autoSaveInterval": 5, // minutes
    "maxLogFileSize": 5242880 // 5MB
  },
  "pluginSupport": {
    "enabled": true,
    "debugMode": true
  }
}
```

## 📈 Monitoring et Performance

### Statistiques Disponibles
- **Services** : État des services et cache
- **Plugins** : Observers et event listeners actifs
- **Logs** : Nombre de logs par type et niveau
- **Performance** : Temps de chargement et mémoire utilisée

### API de Monitoring
```typescript
const stats = plugin.getServices().getStats();
const pluginStats = plugin.getPluginSupportStats();
const logStats = plugin.getLogger().getStats();
```

## 🔄 Migration depuis v0.8.x

### Changements Breaking
- Aucun pour les utilisateurs finaux
- Les développeurs doivent utiliser `ServiceContainer` pour accéder aux services

### Nouvelles Fonctionnalités
- Support universel des plugins activé automatiquement
- Logs sauvegardés automatiquement si activés
- Diagnostics disponibles via les commandes

### Configuration Automatique
Le plugin optimise automatiquement ses paramètres selon :
- Plugins installés détectés
- Performance de l'environnement
- Utilisation mémoire disponible

## 📚 Extensions et API

### Ajouter un Nouveau Plugin Supporté
```typescript
// Dans PluginIntegrationManager.ts
private isPluginElement(element: HTMLElement): boolean {
  return element.matches('.your-plugin-class') ||
         element.hasAttribute('data-your-plugin');
}
```

### Nouveau Service
```typescript
// Hériter du pattern ServiceContainer
export class YourService {
  constructor(
    private app: App,
    private logger: LoggerService
  ) {}
}

// Ajouter au ServiceContainer
this.yourService = new YourService(app, logger);
```

## 📄 Compatibilité

- **Obsidian** : Version 1.0.0+
- **Node.js** : 18+
- **TypeScript** : 4.7+
- **Plugins supportés** : Tasks, Dataview, Kanban, Calendar, etc.

## 🔐 Sécurité et Confidentialité

- Aucune donnée n'est envoyée vers des serveurs externes
- Les logs restent locaux dans votre vault
- Support des plugins sans interception des données sensibles
- Code source ouvert et auditable

---

## 📄 Licence et Contribution

Ce plugin suit les guidelines de développement de plugins Obsidian. Contributions bienvenues via GitHub issues et pull requests.

**Version actuelle** : 0.9.0 - Support Universel des Plugins
**Dernière mise à jour** : Décembre 2024