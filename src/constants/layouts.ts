/**
 * Définitions des layouts intégrés
 * 
 * Ce fichier contient tous les layouts pré-définis du plugin.
 * Chaque layout est documenté avec sa grille et son usage.
 */

import { BoardModel, LayoutInfo } from '@/types';

/**
 * Tous les layouts disponibles avec leurs configurations
 */
export const BUILT_IN_LAYOUTS: BoardModel = {
  /**
   * Matrice d'Eisenhower - 4 quadrants pour la priorisation
   * Grille 2x2 de 12x12 chacun
   */
  layout_eisenhower: [
    { title: "Urgent et Important", x: 0, y: 0, w: 12, h: 12 },
    { title: "Pas urgent mais Important", x: 12, y: 0, w: 12, h: 12 },
    { title: "Urgent mais Pas important", x: 0, y: 12, w: 12, h: 12 },
    { title: "Ni urgent ni important", x: 12, y: 12, w: 12, h: 12 }
  ],

  /**
   * Tableau Kanban classique - 3 colonnes
   * Colonnes de 8 unités de large sur toute la hauteur
   */
  layout_kanban: [
    { title: "À faire", x: 0, y: 0, w: 8, h: 24 },
    { title: "En cours", x: 8, y: 0, w: 8, h: 24 },
    { title: "Terminé", x: 16, y: 0, w: 8, h: 24 }
  ],

  /**
   * Getting Things Done (GTD) - 6 sections
   * Organisation selon la méthode GTD de David Allen
   */
  layout_gtd: [
    { title: "Inbox", x: 0, y: 0, w: 12, h: 8 },
    { title: "Actions suivantes", x: 12, y: 0, w: 12, h: 8 },
    { title: "En attente", x: 0, y: 8, w: 8, h: 8 },
    { title: "Projets", x: 8, y: 8, w: 8, h: 8 },
    { title: "Someday Maybe", x: 16, y: 8, w: 8, h: 8 },
    { title: "Référence", x: 0, y: 16, w: 24, h: 8 }
  ],

  /**
   * Planificateur hebdomadaire - 7 sections
   * 5 jours de travail + weekend + notes
   */
  layout_weekly: [
    { title: "Lundi", x: 0, y: 0, w: 6, h: 12 },
    { title: "Mardi", x: 6, y: 0, w: 6, h: 12 },
    { title: "Mercredi", x: 12, y: 0, w: 6, h: 12 },
    { title: "Jeudi", x: 18, y: 0, w: 6, h: 12 },
    { title: "Vendredi", x: 0, y: 12, w: 8, h: 12 },
    { title: "Weekend", x: 8, y: 12, w: 8, h: 12 },
    { title: "Notes", x: 16, y: 12, w: 8, h: 12 }
  ],

  /**
   * Board simple - 2 colonnes
   * Idéal pour des comparaisons ou du brainstorming
   */
  layout_simple: [
    { title: "Ideas", x: 0, y: 0, w: 12, h: 24 },
    { title: "Actions", x: 12, y: 0, w: 12, h: 24 }
  ],

  /**
   * Notes Cornell - 3 sections organisées
   * Méthode de prise de notes structurée
   */
  layout_cornell: [
    { title: "Notes", x: 0, y: 0, w: 16, h: 18 },
    { title: "Mots-clés", x: 16, y: 0, w: 8, h: 18 },
    { title: "Résumé", x: 0, y: 18, w: 24, h: 6 }
  ],

  /**
   * Planificateur quotidien - 6 sections
   * Organisation détaillée pour une journée
   */
  layout_daily: [
    { title: "Objectifs du jour", x: 0, y: 0, w: 12, h: 8 },
    { title: "Tâches prioritaires", x: 12, y: 0, w: 12, h: 8 },
    { title: "Planning", x: 0, y: 8, w: 8, h: 8 },
    { title: "Notes", x: 8, y: 8, w: 8, h: 8 },
    { title: "Apprentissages", x: 16, y: 8, w: 8, h: 8 },
    { title: "Réflexions", x: 0, y: 16, w: 24, h: 8 }
  ],

  /**
   * Gestion de projet - 6 sections
   * Vue d'ensemble complète d'un projet
   */
  layout_project: [
    { title: "Vue d'ensemble", x: 0, y: 0, w: 24, h: 6 },
    { title: "Objectifs", x: 0, y: 6, w: 8, h: 9 },
    { title: "Étapes", x: 8, y: 6, w: 8, h: 9 },
    { title: "Ressources", x: 16, y: 6, w: 8, h: 9 },
    { title: "Risques", x: 0, y: 15, w: 12, h: 9 },
    { title: "Suivi", x: 12, y: 15, w: 12, h: 9 }
  ],

  /**
   * Dashboard Tasks (intégration plugin Tasks)
   * Optimisé pour les requêtes Tasks
   */
  layout_tasks_dashboard: [
    { title: "Tâches du jour", x: 0, y: 0, w: 8, h: 12 },
    { title: "Cette semaine", x: 8, y: 0, w: 8, h: 12 },
    { title: "En retard", x: 16, y: 0, w: 8, h: 12 },
    { title: "Projets actifs", x: 0, y: 12, w: 12, h: 12 },
    { title: "Statistiques", x: 12, y: 12, w: 12, h: 12 }
  ],

  /**
   * Analytics Dataview (intégration plugin Dataview)
   * Optimisé pour les requêtes Dataview
   */
  layout_dataview_analytics: [
    { title: "Métriques générales", x: 0, y: 0, w: 12, h: 8 },
    { title: "Tendances", x: 12, y: 0, w: 12, h: 8 },
    { title: "Top tags", x: 0, y: 8, w: 8, h: 8 },
    { title: "Fichiers récents", x: 8, y: 8, w: 8, h: 8 },
    { title: "Liens brisés", x: 16, y: 8, w: 8, h: 8 },
    { title: "Données détaillées", x: 0, y: 16, w: 24, h: 8 }
  ]
};

/**
 * Métadonnées des layouts pour l'interface utilisateur
 */
export const LAYOUT_INFO: Record<string, LayoutInfo> = {
  layout_eisenhower: {
    name: 'layout_eisenhower',
    displayName: 'Matrice d\'Eisenhower',
    description: 'Priorisez vos tâches selon urgence et importance',
    sections: ['Urgent et Important', 'Pas urgent mais Important', 'Urgent mais Pas important', 'Ni urgent ni important'],
    blockCount: 4,
    category: 'productivity'
  },
  
  layout_kanban: {
    name: 'layout_kanban',
    displayName: 'Tableau Kanban',
    description: 'Visualisez le flux de travail en 3 colonnes',
    sections: ['À faire', 'En cours', 'Terminé'],
    blockCount: 3,
    category: 'workflow'
  },
  
  layout_gtd: {
    name: 'layout_gtd',
    displayName: 'Getting Things Done',
    description: 'Organisez selon la méthode GTD de David Allen',
    sections: ['Inbox', 'Actions suivantes', 'En attente', 'Projets', 'Someday Maybe', 'Référence'],
    blockCount: 6,
    category: 'productivity'
  },
  
  layout_weekly: {
    name: 'layout_weekly',
    displayName: 'Planificateur Hebdomadaire',
    description: 'Planifiez votre semaine jour par jour',
    sections: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Weekend', 'Notes'],
    blockCount: 7,
    category: 'planning'
  },
  
  layout_daily: {
    name: 'layout_daily',
    displayName: 'Planificateur Quotidien',
    description: 'Structurez votre journée en détail',
    sections: ['Objectifs du jour', 'Tâches prioritaires', 'Planning', 'Notes', 'Apprentissages', 'Réflexions'],
    blockCount: 6,
    category: 'planning'
  },
  
  layout_project: {
    name: 'layout_project',
    displayName: 'Gestion de Projet',
    description: 'Vue d\'ensemble complète d\'un projet',
    sections: ['Vue d\'ensemble', 'Objectifs', 'Étapes', 'Ressources', 'Risques', 'Suivi'],
    blockCount: 6,
    category: 'project'
  },
  
  layout_simple: {
    name: 'layout_simple',
    displayName: 'Board Simple',
    description: 'Deux colonnes pour comparaisons ou brainstorming',
    sections: ['Ideas', 'Actions'],
    blockCount: 2,
    category: 'basic'
  },
  
  layout_cornell: {
    name: 'layout_cornell',
    displayName: 'Notes Cornell',
    description: 'Méthode de prise de notes structurée',
    sections: ['Notes', 'Mots-clés', 'Résumé'],
    blockCount: 3,
    category: 'notes'
  },
  
  layout_tasks_dashboard: {
    name: 'layout_tasks_dashboard',
    displayName: 'Dashboard Tasks',
    description: 'Intégration avancée avec le plugin Tasks',
    sections: ['Tâches du jour', 'Cette semaine', 'En retard', 'Projets actifs', 'Statistiques'],
    blockCount: 5,
    category: 'integration'
  },
  
  layout_dataview_analytics: {
    name: 'layout_dataview_analytics',
    displayName: 'Analytics Dataview',
    description: 'Tableaux de bord avec le plugin Dataview',
    sections: ['Métriques générales', 'Tendances', 'Top tags', 'Fichiers récents', 'Liens brisés', 'Données détaillées'],
    blockCount: 6,
    category: 'integration'
  }
};

/**
 * Categories de layouts disponibles
 */
export const LAYOUT_CATEGORIES = {
  basic: 'Basique',
  productivity: 'Productivité',
  planning: 'Planification',
  workflow: 'Flux de travail',
  project: 'Gestion de projet',
  notes: 'Prise de notes',
  integration: 'Intégrations'
} as const;