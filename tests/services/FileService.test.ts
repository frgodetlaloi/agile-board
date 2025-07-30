/**
 * =============================================================================
 * TESTS COMPLETS POUR FILESERVICE
 * =============================================================================
 * 
 * Tests pour toutes les méthodes principales du FileService :
 * - parseSections() : Parsing des sections H1
 * - createMissingSections() : Création automatique des sections
 * - updateSection() : Mise à jour de contenu de section
 * - getMissingSections() : Identification des sections manquantes
 * - findInsertionPoint() : Point d'insertion optimal
 */

import { FileService } from '../../src/services/FileService';
import { createMockApp, createMockTFile } from '../setup';
import { BoardLayout } from '../../src/types';

describe('FileService', () => {
  let fileService: FileService;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    fileService = new FileService(mockApp);
  });

  // ===========================================================================
  // TESTS POUR parseSections()
  // ===========================================================================

  describe('parseSections()', () => {
    test('devrait parser correctement un fichier avec sections H1', async () => {
      const mockFile = createMockTFile('test.md');
      const content = `---
agile-board: layout_eisenhower
---

# Urgent et Important
- Tâche urgente 1
- Tâche urgente 2

# Pas urgent mais Important
- Tâche importante 1
- Tâche importante 2

# Urgent mais Pas important
Contenu de cette section

# Ni urgent ni important
Dernière section`;

      mockApp.vault.read.mockResolvedValue(content);

      const sections = await fileService.parseSections(mockFile);

      // Vérifier que toutes les sections sont trouvées
      expect(Object.keys(sections)).toEqual([
        'Urgent et Important',
        'Pas urgent mais Important',
        'Urgent mais Pas important',
        'Ni urgent ni important'
      ]);

      // Vérifier le contenu de la première section
      expect(sections['Urgent et Important'].lines).toEqual([
        '- Tâche urgente 1',
        '- Tâche urgente 2',
        ''
      ]);

      // Vérifier les positions start/end
      expect(sections['Urgent et Important'].start).toBe(4); // Ligne du titre
      expect(sections['Urgent et Important'].end).toBe(8);   // Avant la section suivante
    });

    test('devrait gérer un fichier vide', async () => {
      const mockFile = createMockTFile('empty.md');
      mockApp.vault.read.mockResolvedValue('');

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual([]);
    });

    test('devrait gérer un fichier sans sections H1', async () => {
      const mockFile = createMockTFile('no-sections.md');
      const content = `Juste du texte normal
## Sous-titre H2 (pas pris en compte)
Autre contenu
### H3 aussi ignoré`;

      mockApp.vault.read.mockResolvedValue(content);

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual([]);
    });

    test('devrait parser correctement avec frontmatter YAML', async () => {
      const mockFile = createMockTFile('with-frontmatter.md');
      const content = `---
title: Mon fichier
agile-board: layout_kanban
tags: [test, board]
---

# À faire
- Première tâche
- Deuxième tâche

# En cours
Contenu en cours

# Terminé
Tâches terminées`;

      mockApp.vault.read.mockResolvedValue(content);

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual(['À faire', 'En cours', 'Terminé']);
      expect(sections['À faire'].lines).toEqual(['- Première tâche', '- Deuxième tâche', '']);
    });

    test('devrait gérer des sections vides', async () => {
      const mockFile = createMockTFile('empty-sections.md');
      const content = `# Section avec contenu
Du contenu ici

# Section vide

# Autre section avec contenu
Plus de contenu`;

      mockApp.vault.read.mockResolvedValue(content);

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual([
        'Section avec contenu',
        'Section vide',
        'Autre section avec contenu'
      ]);

      expect(sections['Section vide'].lines).toEqual(['']);
    });

    test('devrait gérer des titres H1 avec espaces et caractères spéciaux', async () => {
      const mockFile = createMockTFile('special-titles.md');
      const content = `#   Titre avec espaces   
Contenu 1

# Titre-avec-tirets
Contenu 2

# Titre (avec parenthèses)
Contenu 3`;

      mockApp.vault.read.mockResolvedValue(content);

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual([
        'Titre avec espaces',
        'Titre-avec-tirets',
        'Titre (avec parenthèses)'
      ]);
    });
  });

  // ===========================================================================
  // TESTS POUR getMissingSections()
  // ===========================================================================

  describe('getMissingSections()', () => {
    test('devrait identifier les sections manquantes', () => {
      const existingSections = ['Section A', 'Section C'];
      const requiredSections = ['Section A', 'Section B', 'Section C', 'Section D'];

      const missing = fileService.getMissingSections(existingSections, requiredSections);

      expect(missing).toEqual(['Section B', 'Section D']);
    });

    test('devrait retourner un tableau vide si toutes les sections sont présentes', () => {
      const existingSections = ['Section A', 'Section B', 'Section C'];
      const requiredSections = ['Section A', 'Section B', 'Section C'];

      const missing = fileService.getMissingSections(existingSections, requiredSections);

      expect(missing).toEqual([]);
    });

    test('devrait gérer le cas où il y a plus de sections existantes que requises', () => {
      const existingSections = ['Section A', 'Section B', 'Section C', 'Section Extra'];
      const requiredSections = ['Section A', 'Section B'];

      const missing = fileService.getMissingSections(existingSections, requiredSections);

      expect(missing).toEqual([]);
    });

    test('devrait gérer des sections avec noms similaires', () => {
      const existingSections = ['À faire', 'En cours'];
      const requiredSections = ['À faire', 'En cours', 'Terminé', 'À faire plus tard'];

      const missing = fileService.getMissingSections(existingSections, requiredSections);

      expect(missing).toEqual(['Terminé', 'À faire plus tard']);
    });

    test('devrait gérer des tableaux vides', () => {
      expect(fileService.getMissingSections([], [])).toEqual([]);
      expect(fileService.getMissingSections([], ['Section A'])).toEqual(['Section A']);
      expect(fileService.getMissingSections(['Section A'], [])).toEqual([]);
    });
  });

  // ===========================================================================
  // TESTS POUR createMissingSections()
  // ===========================================================================

  describe('createMissingSections()', () => {
    test('devrait créer les sections manquantes dans un fichier vide', async () => {
      const mockFile = createMockTFile('empty-file.md');
      const layout: BoardLayout[] = [
        { title: 'À faire', x: 0, y: 0, w: 8, h: 24 },
        { title: 'En cours', x: 8, y: 0, w: 8, h: 24 },
        { title: 'Terminé', x: 16, y: 0, w: 8, h: 24 }
      ];

      // Mock du fichier vide
      mockApp.vault.read.mockResolvedValue('');
      mockApp.vault.modify.mockResolvedValue(undefined);

      const result = await fileService.createMissingSections(mockFile, layout);

      expect(result).toBe(true);
      expect(mockApp.vault.modify).toHaveBeenCalledTimes(1);

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      expect(modifiedContent).toContain('# À faire');
      expect(modifiedContent).toContain('# En cours');
      expect(modifiedContent).toContain('# Terminé');
    });

    test('devrait ajouter seulement les sections manquantes', async () => {
      const mockFile = createMockTFile('partial-file.md');
      const layout: BoardLayout[] = [
        { title: 'À faire', x: 0, y: 0, w: 8, h: 24 },
        { title: 'En cours', x: 8, y: 0, w: 8, h: 24 },
        { title: 'Terminé', x: 16, y: 0, w: 8, h: 24 }
      ];

      const existingContent = `# À faire
- Tâche existante

# Terminé
- Tâche terminée`;

      mockApp.vault.read.mockResolvedValue(existingContent);
      mockApp.vault.modify.mockResolvedValue(undefined);

      const result = await fileService.createMissingSections(mockFile, layout);

      expect(result).toBe(true);
      expect(mockApp.vault.modify).toHaveBeenCalledTimes(1);

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      expect(modifiedContent).toContain('# En cours'); // Section ajoutée
      expect(modifiedContent).toContain('- Tâche existante'); // Contenu préservé
    });

    test('devrait retourner false si toutes les sections sont présentes', async () => {
      const mockFile = createMockTFile('complete-file.md');
      const layout: BoardLayout[] = [
        { title: 'À faire', x: 0, y: 0, w: 8, h: 24 },
        { title: 'Terminé', x: 16, y: 0, w: 8, h: 24 }
      ];

      const completeContent = `# À faire
- Tâche 1

# Terminé
- Tâche terminée`;

      mockApp.vault.read.mockResolvedValue(completeContent);

      const result = await fileService.createMissingSections(mockFile, layout);

      expect(result).toBe(false);
      expect(mockApp.vault.modify).not.toHaveBeenCalled();
    });

    test('devrait insérer après le frontmatter YAML', async () => {
      const mockFile = createMockTFile('with-frontmatter.md');
      const layout: BoardLayout[] = [
        { title: 'Nouvelle section', x: 0, y: 0, w: 12, h: 12 }
      ];

      const contentWithFrontmatter = `---
title: Mon fichier
agile-board: layout_test
---

Contenu existant`;

      mockApp.vault.read.mockResolvedValue(contentWithFrontmatter);
      mockApp.vault.modify.mockResolvedValue(undefined);

      const result = await fileService.createMissingSections(mockFile, layout);

      expect(result).toBe(true);

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      const lines = modifiedContent.split('\n');
      
      // Le frontmatter doit être préservé
      expect(lines[0]).toBe('---');
      expect(lines[1]).toContain('title: Mon fichier');
      expect(lines[3]).toBe('---');
      
      // La nouvelle section doit être ajoutée après
      expect(modifiedContent).toContain('# Nouvelle section');
    });
  });

  // ===========================================================================
  // TESTS POUR updateSection()
  // ===========================================================================

  describe('updateSection()', () => {
    test('devrait mettre à jour le contenu d\'une section existante', async () => {
      const mockFile = createMockTFile('update-test.md');
      const originalContent = `# Section 1
Ancien contenu de la section 1

# Section 2
Contenu de la section 2

# Section 3
Contenu de la section 3`;

      const newContent = `Nouveau contenu pour la section 1
- Point 1
- Point 2`;

      // Mock des appels vault.read (appelé deux fois : parseSections + updateSection)
      mockApp.vault.read
        .mockResolvedValueOnce(originalContent) // Pour parseSections
        .mockResolvedValueOnce(originalContent); // Pour updateSection

      mockApp.vault.modify.mockResolvedValue(undefined);

      await fileService.updateSection(mockFile, 'Section 1', newContent);

      expect(mockApp.vault.modify).toHaveBeenCalledTimes(1);

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      
      // Vérifier que le nouveau contenu est présent
      expect(modifiedContent).toContain('Nouveau contenu pour la section 1');
      expect(modifiedContent).toContain('- Point 1');
      expect(modifiedContent).toContain('- Point 2');
      
      // Vérifier que les autres sections sont préservées
      expect(modifiedContent).toContain('# Section 2');
      expect(modifiedContent).toContain('Contenu de la section 2');
      expect(modifiedContent).toContain('# Section 3');
    });

    test('ne devrait rien faire si la section n\'existe pas', async () => {
      const mockFile = createMockTFile('no-section.md');
      const content = `# Section existante
Contenu`;

      mockApp.vault.read.mockResolvedValue(content);

      // Mock console.warn pour vérifier qu'il est appelé
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await fileService.updateSection(mockFile, 'Section inexistante', 'Nouveau contenu');

      expect(mockApp.vault.modify).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Section "Section inexistante" non trouvée')
      );

      consoleSpy.mockRestore();
    });

    test('devrait gérer la mise à jour de la dernière section', async () => {
      const mockFile = createMockTFile('last-section.md');
      const originalContent = `# Première section
Contenu 1

# Dernière section
Ancien contenu de la dernière section`;

      const newContent = `Nouveau contenu final
Fin du fichier`;

      mockApp.vault.read
        .mockResolvedValueOnce(originalContent)
        .mockResolvedValueOnce(originalContent);

      mockApp.vault.modify.mockResolvedValue(undefined);

      await fileService.updateSection(mockFile, 'Dernière section', newContent);

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      
      expect(modifiedContent).toContain('Nouveau contenu final');
      expect(modifiedContent).toContain('Fin du fichier');
      expect(modifiedContent).toContain('# Première section');
      expect(modifiedContent).toContain('Contenu 1');
    });

    test('devrait gérer le contenu vide', async () => {
      const mockFile = createMockTFile('empty-content.md');
      const originalContent = `# Section à vider
Contenu à supprimer

# Autre section
Contenu à conserver`;

      mockApp.vault.read
        .mockResolvedValueOnce(originalContent)
        .mockResolvedValueOnce(originalContent);

      mockApp.vault.modify.mockResolvedValue(undefined);

      await fileService.updateSection(mockFile, 'Section à vider', '');

      const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
      
      // La section doit exister mais être vide
      expect(modifiedContent).toContain('# Section à vider');
      expect(modifiedContent).not.toContain('Contenu à supprimer');
      expect(modifiedContent).toContain('# Autre section');
      expect(modifiedContent).toContain('Contenu à conserver');
    });
  });

  // ===========================================================================
  // TESTS D'INTÉGRATION
  // ===========================================================================

  describe('Tests d\'intégration', () => {
    test('workflow complet : parsing → détection manquantes → création', async () => {
      const mockFile = createMockTFile('workflow-test.md');
      const layout: BoardLayout[] = [
        { title: 'Section A', x: 0, y: 0, w: 12, h: 12 },
        { title: 'Section B', x: 12, y: 0, w: 12, h: 12 },
        { title: 'Section C', x: 0, y: 12, w: 12, h: 12 }
      ];

      // Fichier avec seulement une section
      const initialContent = `# Section A
Contenu existant de A`;

      mockApp.vault.read.mockResolvedValue(initialContent);
      mockApp.vault.modify.mockResolvedValue(undefined);

      // 1. Parser les sections existantes
      const sections = await fileService.parseSections(mockFile);
      expect(Object.keys(sections)).toEqual(['Section A']);

      // 2. Identifier les sections manquantes
      const existingSections = Object.keys(sections);
      const requiredSections = layout.map(block => block.title);
      const missing = fileService.getMissingSections(existingSections, requiredSections);
      expect(missing).toEqual(['Section B', 'Section C']);

      // 3. Créer les sections manquantes
      const created = await fileService.createMissingSections(mockFile, layout);
      expect(created).toBe(true);

      // Vérifier le résultat final
      const finalContent = mockApp.vault.modify.mock.calls[0][1];
      expect(finalContent).toContain('# Section A');
      expect(finalContent).toContain('# Section B');
      expect(finalContent).toContain('# Section C');
      expect(finalContent).toContain('Contenu existant de A');
    });

    test('devrait gérer les fichiers avec structure complexe', async () => {
      const mockFile = createMockTFile('complex-file.md');
      const complexContent = `---
title: Fichier complexe
tags: [test, complex]
agile-board: layout_eisenhower
---

# Introduction
Ceci est une introduction qui ne fait pas partie des sections de layout.

# Urgent et Important
- Tâche critique 1
- Tâche critique 2

Paragraphe explicatif.

> Citation importante

# Pas urgent mais Important
- [ ] Tâche à planifier
- [x] Tâche déjà planifiée

## Sous-section (H2, pas prise en compte)
Contenu de sous-section

# Notes additionnelles
Cette section n'est pas dans le layout Eisenhower mais doit être préservée.`;

      mockApp.vault.read.mockResolvedValue(complexContent);

      const sections = await fileService.parseSections(mockFile);

      expect(Object.keys(sections)).toEqual([
        'Introduction',
        'Urgent et Important',
        'Pas urgent mais Important',
        'Notes additionnelles'
      ]);

      // Vérifier que le contenu complexe est bien parsé
      expect(sections['Urgent et Important'].lines).toContain('- Tâche critique 1');
      expect(sections['Urgent et Important'].lines).toContain('> Citation importante');
      
      expect(sections['Pas urgent mais Important'].lines).toContain('- [ ] Tâche à planifier');
      expect(sections['Pas urgent mais Important'].lines).toContain('## Sous-section (H2, pas prise en compte)');
    });
  });

  // ===========================================================================
  // TESTS DE GESTION D'ERREURS
  // ===========================================================================

  describe('Gestion d\'erreurs', () => {
    test('devrait gérer les erreurs de lecture de fichier', async () => {
      const mockFile = createMockTFile('error-file.md');
      
      mockApp.vault.read.mockRejectedValue(new Error('Fichier non trouvé'));

      await expect(fileService.parseSections(mockFile)).rejects.toThrow('Fichier non trouvé');
    });

    test('devrait gérer les erreurs de sauvegarde', async () => {
      const mockFile = createMockTFile('save-error.md');
      const layout: BoardLayout[] = [
        { title: 'Test Section', x: 0, y: 0, w: 12, h: 12 }
      ];

      mockApp.vault.read.mockResolvedValue('');
      mockApp.vault.modify.mockRejectedValue(new Error('Erreur de sauvegarde'));

      await expect(fileService.createMissingSections(mockFile, layout)).rejects.toThrow('Erreur de sauvegarde');
    });
  });
});