/**
 * Tests pour LayoutService - Cœur de ton plugin
 */

import { LayoutService } from '../../src/services/LayoutService';
import { createMockPlugin } from '../setup';

describe('LayoutService', () => {
  let layoutService: LayoutService;
  let mockPlugin: any;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    layoutService = new LayoutService(mockPlugin);
  });

  describe('Chargement des layouts', () => {
    test('devrait charger les layouts intégrés', () => {
      // Charger les layouts
      layoutService.load();

      // Vérifier que des layouts sont disponibles
      const layouts = layoutService.getAllModelNames();
      expect(layouts.length).toBeGreaterThan(0);
      expect(layouts).toContain('layout_eisenhower');
      expect(layouts).toContain('layout_kanban');
    });

    test('devrait retourner un layout valide', () => {
      layoutService.load();

      const eisenhowerLayout = layoutService.getModel('layout_eisenhower');
      
      expect(eisenhowerLayout).toBeDefined();
      expect(Array.isArray(eisenhowerLayout)).toBe(true);
      expect(eisenhowerLayout!.length).toBe(4); // 4 quadrants
      
      // Vérifier la structure des blocs
      eisenhowerLayout!.forEach(block => {
        expect(block).toHaveProperty('title');
        expect(block).toHaveProperty('x');
        expect(block).toHaveProperty('y');
        expect(block).toHaveProperty('w');
        expect(block).toHaveProperty('h');
        expect(typeof block.x).toBe('number');
        expect(typeof block.y).toBe('number');
        expect(typeof block.w).toBe('number');
        expect(typeof block.h).toBe('number');
      });
    });

    test('devrait retourner undefined pour un layout inexistant', () => {
      layoutService.load();

      const inexistantLayout = layoutService.getModel('layout_inexistant');
      expect(inexistantLayout).toBeUndefined();
    });
  });

  describe('Informations des layouts', () => {
    beforeEach(() => {
      layoutService.load();
    });

    test('devrait retourner le nom d\'affichage correct', () => {
      const displayName = layoutService.getLayoutDisplayName('layout_eisenhower');
      expect(displayName).toBe('Matrice d\'Eisenhower');
    });

    test('devrait retourner le nom technique pour un layout inconnu', () => {
      const displayName = layoutService.getLayoutDisplayName('layout_custom');
      expect(displayName).toBe('layout_custom');
    });

    test('devrait retourner les métadonnées complètes', () => {
      const info = layoutService.getModelInfo('layout_kanban');
      
      expect(info).toBeDefined();
      expect(info!.name).toBe('layout_kanban');
      expect(info!.displayName).toBe('Tableau Kanban');
      expect(info!.sections).toEqual(['À faire', 'En cours', 'Terminé']);
      expect(info!.blockCount).toBe(3);
    });

    test('devrait retourner toutes les métadonnées', () => {
      const allInfo = layoutService.getAllModelsInfo();
      
      expect(Array.isArray(allInfo)).toBe(true);
      expect(allInfo.length).toBeGreaterThan(0);
      
      // Vérifier qu'on a au moins les layouts principaux
      const names = allInfo.map(info => info.name);
      expect(names).toContain('layout_eisenhower');
      expect(names).toContain('layout_kanban');
      expect(names).toContain('layout_gtd');
    });
  });
});