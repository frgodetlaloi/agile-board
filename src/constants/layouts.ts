/**
 * =============================================================================
 * DÉFINITIONS DES LAYOUTS INTÉGRÉS POUR LE PLUGIN AGILE BOARD
 * =============================================================================
 * 
 * Ce fichier contient tous les layouts (modèles de grille) prédéfinis du plugin.
 * Chaque layout définit un agencement spécifique de blocs pour différents usages.
 * 
 * CONCEPT DU SYSTÈME DE GRILLE :
 * - Grille de 24 colonnes de large (standard responsive web)
 * - Hauteur variable jusqu'à 100 lignes maximum
 * - Chaque bloc est un rectangle défini par (x, y, largeur, hauteur)
 * - Coordonnées en nombres entiers (pas de pixels ou pourcentages)
 * - Aucun chevauchement autorisé entre les blocs
 * 
 * SYSTÈME DE COORDONNÉES :
 * - x: 0-23 (position horizontale, 0 = gauche, 23 = droite)
 * - y: 0-99 (position verticale, 0 = haut, 99 = bas)
 * - w: 1-24 (largeur en colonnes, doit respecter x + w ≤ 24)
 * - h: 1-100 (hauteur en lignes, doit respecter y + h ≤ 100)
 * 
 * MÉTHODOLOGIES SUPPORTÉES :
 * Ce fichier implémente des méthodes de productivité reconnues :
 * - Eisenhower Matrix (priorisation urgent/important)
 * - Kanban (flux de travail visuel)
 * - GTD - Getting Things Done (David Allen)
 * - Planning temporel (quotidien/hebdomadaire)
 * - Gestion de projet
 * - Prise de notes structurée (Cornell)
 * - Intégrations avec plugins Obsidian (Tasks, Dataview)
 * 
 * CONVENTION DE NOMMAGE :
 * - Préfixe "layout_" pour tous les identifiants de layout
 * - Noms en snake_case (layout_eisenhower, layout_kanban)
 * - Noms courts et explicites en anglais
 * - Correspondance avec les noms de commandes du plugin
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des types depuis notre fichier de définitions
// ATTENTION : Utilisation du chemin relatif corrigé (pas d'alias @/)
import { BoardModel, LayoutInfo } from '../types';

// =============================================================================
// LAYOUTS PRÉDÉFINIS - CATALOGUE COMPLET
// =============================================================================

/**
 * Catalogue complet de tous les layouts disponibles
 * 
 * ORGANISATION :
 * Chaque layout est documenté avec :
 * - Sa méthodologie ou philosophie sous-jacente
 * - Son organisation visuelle (diagramme ASCII)
 * - Ses cas d'usage recommandés
 * - Sa grille technique (coordonnées précises)
 * 
 * VALIDATION :
 * Tous ces layouts sont validés automatiquement par LayoutService
 * pour vérifier l'absence de chevauchements et le respect des limites.
 */
export const BUILT_IN_LAYOUTS: BoardModel = {

  // ===========================================================================
  // SECTION 1 : LAYOUTS DE PRODUCTIVITÉ ET PRIORISATION
  // ===========================================================================

  /**
   * MATRICE D'EISENHOWER - Système de priorisation présidentiel
   * 
   * MÉTHODOLOGIE :
   * Créée par le président Dwight D. Eisenhower, cette matrice classe
   * les tâches selon deux axes orthogonaux : Urgent vs Important.
   * 
   * PHILOSOPHIE :
   * "Ce qui est important est rarement urgent et ce qui est urgent 
   * est rarement important." - Eisenhower
   * 
   * QUADRANTS :
   * 1. Urgent ET Important (Q1) → FAIRE immédiatement
   * 2. Important mais PAS Urgent (Q2) → PLANIFIER (zone optimale)
   * 3. Urgent mais PAS Important (Q3) → DÉLÉGUER
   * 4. NI Urgent NI Important (Q4) → ÉLIMINER
   * 
   * DIAGRAMME VISUEL :
   * ┌─────────────────┬─────────────────┐
   * │ URGENT ET       │ PAS URGENT      │
   * │ IMPORTANT       │ MAIS IMPORTANT  │
   * │ ⚡ DO NOW ⚡    │ 📅 SCHEDULE 📅  │
   * │ (Crises,        │ (Planification, │
   * │  Urgences)      │  Prévention)    │
   * ├─────────────────┼─────────────────┤
   * │ URGENT MAIS     │ NI URGENT       │
   * │ PAS IMPORTANT   │ NI IMPORTANT    │
   * │ 👥 DELEGATE 👥  │ 🗑️ DELETE 🗑️   │
   * │ (Interruptions, │ (Distractions,  │
   * │  Certains mails)│  Réseaux soc.)  │
   * └─────────────────┴─────────────────┘
   * 
   * GRILLE TECHNIQUE : 4 quadrants de 12×12 chacun
   * CAS D'USAGE : Gestion quotidienne, décisions stratégiques, leadership
   */
  layout_eisenhower: [
    { 
      title: "Urgent et Important", 
      x: 0, y: 0, w: 12, h: 12 
      // Quadrant Q1 : Actions immédiates, gestion de crise
    },
    { 
      title: "Pas urgent mais Important", 
      x: 12, y: 0, w: 12, h: 12 
      // Quadrant Q2 : Zone optimale de productivité, planification
    },
    { 
      title: "Urgent mais Pas important", 
      x: 0, y: 12, w: 12, h: 12 
      // Quadrant Q3 : Candidats à la délégation
    },
    { 
      title: "Ni urgent ni important", 
      x: 12, y: 12, w: 12, h: 12 
      // Quadrant Q4 : Activités à éliminer ou réduire
    }
  ],

  /**
   * GETTING THINGS DONE (GTD) - Méthode David Allen
   * 
   * MÉTHODOLOGIE :
   * Système complet de productivité développé par David Allen.
   * Basé sur l'externalisation de la mémoire et la clarification systématique.
   * 
   * PRINCIPE CENTRAL :
   * "Votre esprit est fait pour avoir des idées, pas pour les retenir."
   * 
   * FLUX GTD :
   * CAPTURER → CLARIFIER → ORGANISER → RÉVISER → FAIRE
   * 
   * ZONES FONCTIONNELLES :
   * 1. Inbox : Capture de tout ce qui arrive
   * 2. Actions suivantes : Tâches concrètes et faisables
   * 3. En attente : Délégué ou dépendant d'autres
   * 4. Projets : Résultats nécessitant plusieurs actions
   * 5. Someday/Maybe : Idées pour le futur
   * 6. Référence : Informations à conserver
   * 
   * DIAGRAMME VISUEL :
   * ┌──────────────┬──────────────┐
   * │   📥 INBOX   │ ➡️ ACTIONS   │
   * │              │   SUIVANTES  │
   * │ (Collecte    │ (Prochaines  │
   * │  rapide)     │  tâches)     │
   * ├──────┬───────┼──────┬───────┤
   * │⏳ EN │📋 PROJ│🤔 SM │       │
   * │ATTEN.│   ETS │  /M  │       │
   * ├──────┴───────┴──────┴───────┤
   * │      📚 RÉFÉRENCE           │
   * │   (Documentation,           │
   * │    informations)            │
   * └─────────────────────────────┘
   * 
   * GRILLE TECHNIQUE : Optimisée pour le flux GTD
   * CAS D'USAGE : Productivité personnelle, gestion complète des tâches
   */
  layout_gtd: [
    { 
      title: "Inbox", 
      x: 0, y: 0, w: 12, h: 8
      // Zone de capture : tout ce qui arrive sans traitement
    },
    { 
      title: "Actions suivantes", 
      x: 12, y: 0, w: 12, h: 8
      // Tâches clarifiées et prêtes à être exécutées
    },
    { 
      title: "En attente", 
      x: 0, y: 8, w: 8, h: 8
      // Délégué ou en attente de quelqu'un/quelque chose d'autre
    },
    { 
      title: "Projets", 
      x: 8, y: 8, w: 8, h: 8
      // Résultats désirés nécessitant plus d'une action
    },
    { 
      title: "Someday Maybe", 
      x: 16, y: 8, w: 8, h: 8
      // Idées intéressantes pour plus tard
    },
    { 
      title: "Référence", 
      x: 0, y: 16, w: 24, h: 8
      // Informations utiles à conserver pour consultation
    }
  ],

  // ===========================================================================
  // SECTION 2 : LAYOUTS DE FLUX DE TRAVAIL (WORKFLOW)
  // ===========================================================================

  /**
   * TABLEAU KANBAN CLASSIQUE - Visualisation du flux de travail
   * 
   * MÉTHODOLOGIE :
   * Originaire du système de production Toyota, adapté au travail intellectuel.
   * Principe : visualiser le travail, limiter le travail en cours (WIP).
   * 
   * PHILOSOPHIE :
   * Flux tiré (pull) plutôt que poussé (push).
   * Optimisation du débit global plutôt que de l'efficacité locale.
   * 
   * COLONNES STANDARD :
   * 1. À faire (Backlog) : Tâches en attente
   * 2. En cours (Doing/WIP) : Travail actuel (limité)
   * 3. Terminé (Done) : Travail complété
   * 
   * DIAGRAMME VISUEL :
   * ┌────────────┬────────────┬────────────┐
   * │            │            │            │
   * │  📋 À      │  ⚙️ EN     │  ✅ TERMI- │
   * │   FAIRE    │   COURS    │    NÉ      │
   * │            │            │            │
   * │ • Tâche A  │ • Tâche X  │ • Tâche 1  │
   * │ • Tâche B  │ • Tâche Y  │ • Tâche 2  │
   * │ • Tâche C  │            │ • Tâche 3  │
   * │ • ...      │ [WIP: 2]   │ • ...      │
   * │            │            │            │
   * └────────────┴────────────┴────────────┘
   * 
   * GRILLE TECHNIQUE : 3 colonnes égales sur toute la hauteur
   * CAS D'USAGE : Développement logiciel, gestion d'équipe, projets itératifs
   */
  layout_kanban: [
    { 
      title: "À faire", 
      x: 0, y: 0, w: 8, h: 24
      // Backlog : tâches priorisées en attente
    },
    { 
      title: "En cours", 
      x: 8, y: 0, w: 8, h: 24
      // Work In Progress : limite recommandée selon l'équipe
    },
    { 
      title: "Terminé", 
      x: 16, y: 0, w: 8, h: 24
      // Done : validation et archivage des tâches complétées
    }
  ],

  // ===========================================================================
  // SECTION 3 : LAYOUTS DE PLANIFICATION TEMPORELLE
  // ===========================================================================

  /**
   * PLANIFICATEUR HEBDOMADAIRE - Organisation par jour de la semaine
   * 
   * MÉTHODOLOGIE :
   * Planification cyclique basée sur la semaine de travail standard.
   * Équilibre entre productivité professionnelle et bien-être personnel.
   * 
   * PHILOSOPHIE :
   * Rythme hebdomadaire naturel avec distinction travail/repos.
   * Vision d'ensemble pour une planification équilibrée.
   * 
   * ORGANISATION :
   * - 5 jours de travail avec sections dédiées
   * - Weekend groupé pour activités personnelles
   * - Zone de notes pour observations et réflexions
   * 
   * DIAGRAMME VISUEL :
   * ┌─────┬─────┬─────┬─────┐
   * │ LUN │ MAR │ MER │ JEU │
   * │     │     │     │     │
   * │ 📅  │ 📅  │ 📅  │ 📅  │
   * │     │     │     │     │
   * ├─────┼─────┼─────┴─────┤
   * │ VEN │ W-E │   📝      │
   * │     │ 🏖️  │   NOTES   │
   * │ 📅  │     │           │
   * │     │     │           │
   * └─────┴─────┴───────────┘
   * 
   * GRILLE TECHNIQUE : Layout asymétrique optimisé
   * CAS D'USAGE : Planning personnel, coordination d'équipe, revues hebdomadaires
   */
  layout_weekly: [
    { 
      title: "Lundi", 
      x: 0, y: 0, w: 6, h: 12 
      // Démarrage de semaine, objectifs et planification
    },
    { 
      title: "Mardi", 
      x: 6, y: 0, w: 6, h: 12 
      // Productivité optimale, tâches importantes
    },
    { 
      title: "Mercredi", 
      x: 12, y: 0, w: 6, h: 12 
      // Milieu de semaine, ajustements et révisions
    },
    { 
      title: "Jeudi", 
      x: 18, y: 0, w: 6, h: 12 
      // Finalisation des livrables de la semaine
    },
    { 
      title: "Vendredi", 
      x: 0, y: 12, w: 8, h: 12 
      // Clôture, bilans et préparation semaine suivante
    },
    { 
      title: "Weekend", 
      x: 8, y: 12, w: 8, h: 12
      // Repos, activités personnelles, famille, loisirs
    },
    { 
      title: "Notes", 
      x: 16, y: 12, w: 8, h: 12
      // Observations, idées, réflexions et apprentissages
    }
  ],

  /**
   * PLANIFICATEUR QUOTIDIEN - Structure détaillée d'une journée
   * 
   * MÉTHODOLOGIE :
   * Organisation méticuleuse d'une journée avec focus sur l'apprentissage
   * et la réflexion. Inspiré des méthodes de développement personnel.
   * 
   * PHILOSOPHIE :
   * Journée intentionnelle avec boucle d'amélioration continue.
   * Équilibre entre action et réflexion.
   * 
   * STRUCTURE :
   * - Objectifs clairs et limités (max 3)
   * - Tâches prioritaires identifiées
   * - Planning temporel structuré
   * - Capture d'apprentissages
   * - Réflexion et bilan de fin de journée
   * 
   * DIAGRAMME VISUEL :
   * ┌─────────────┬─────────────┐
   * │ 🎯 OBJECTIFS│ ⭐ PRIORITÉS │
   * │   DU JOUR   │             │
   * │             │             │
   * ├─────┬───────┼─────┬───────┤
   * │📅PLA│📝 NOT│📚APP│💭 RÉF │
   * │NING │   ES │RENT.│  LEX. │
   * │     │      │     │       │
   * ├─────┴──────┴─────┴───────┤
   * │      💡 RÉFLEXIONS       │
   * │     ET BILAN QUOTIDIEN   │
   * └─────────────────────────┘
   * 
   * GRILLE TECHNIQUE : 6 sections pour journée structurée
   * CAS D'USAGE : Développement personnel, productivité quotidienne
   */
  layout_daily: [
    { 
      title: "Objectifs du jour", 
      x: 0, y: 0, w: 12, h: 8
      // Maximum 3 objectifs SMART pour la journée
    },
    { 
      title: "Tâches prioritaires", 
      x: 12, y: 0, w: 12, h: 8
      // Actions importantes qui font avancer les objectifs
    },
    { 
      title: "Planning", 
      x: 0, y: 8, w: 8, h: 8
      // Emploi du temps, rendez-vous, créneaux de travail
    },
    { 
      title: "Notes", 
      x: 8, y: 8, w: 8, h: 8
      // Capture rapide d'idées, observations, informations
    },
    { 
      title: "Apprentissages", 
      x: 16, y: 8, w: 8, h: 8
      // Ce que j'ai appris aujourd'hui (compétences, insights)
    },
    { 
      title: "Réflexions", 
      x: 0, y: 16, w: 24, h: 8
      // Bilan de journée, points d'amélioration, gratitude
    }
  ],

  // ===========================================================================
  // SECTION 4 : LAYOUTS DE GESTION DE PROJET
  // ===========================================================================

  /**
   * GESTION DE PROJET COMPLÈTE - Vue d'ensemble projet
   * 
   * MÉTHODOLOGIE :
   * Approche holistique de la gestion de projet intégrant tous les aspects
   * essentiels. Inspiré des méthodologies PMI et Agile.
   * 
   * PHILOSOPHIE :
   * Vision systémique du projet avec équilibre entre planification
   * et adaptabilité.
   * 
   * COMPOSANTS :
   * - Vue d'ensemble : Contexte et vision globale
   * - Objectifs : Résultats mesurables attendus
   * - Étapes : Jalons et phases du projet
   * - Ressources : Équipe, budget, outils
   * - Risques : Identification et mitigation
   * - Suivi : Métriques et progression
   * 
   * DIAGRAMME VISUEL :
   * ┌─────────────────────────────────┐
   * │       🎯 VUE D'ENSEMBLE         │
   * │    (Vision, contexte, enjeux)   │
   * ├───────────┬───────────┬─────────┤
   * │📋 OBJECTI │🚀 ÉTAPES  │💼 RESSO-│
   * │   FS      │           │   URCES │
   * │           │           │         │
   * ├───────────┴─────┬─────┴─────────┤
   * │  ⚠️ RISQUES     │ 📊 SUIVI     │
   * │                 │               │
   * └─────────────────┴───────────────┘
   * 
   * GRILLE TECHNIQUE : Vue hiérarchique avec header
   * CAS D'USAGE : Gestion de projet, initiatives stratégiques, lancements
   */
  layout_project: [
    { 
      title: "Vue d'ensemble", 
      x: 0, y: 0, w: 24, h: 6
      // Contexte, vision, objectifs généraux, parties prenantes
    },
    { 
      title: "Objectifs", 
      x: 0, y: 6, w: 8, h: 9
      // Objectifs SMART, critères de succès, KPIs
    },
    { 
      title: "Étapes", 
      x: 8, y: 6, w: 8, h: 9
      // Jalons, phases, roadmap, planning général
    },
    { 
      title: "Ressources", 
      x: 16, y: 6, w: 8, h: 9
      // Équipe, budget, outils, compétences nécessaires
    },
    { 
      title: "Risques", 
      x: 0, y: 15, w: 12, h: 9
      // Identification, évaluation, plans de mitigation
    },
    { 
      title: "Suivi", 
      x: 12, y: 15, w: 12, h: 9
      // Métriques, avancement, reporting, ajustements
    }
  ],

  // ===========================================================================
  // SECTION 5 : LAYOUTS BASIQUES ET POLYVALENTS
  // ===========================================================================

  /**
   * BOARD SIMPLE - Approche minimaliste 2 colonnes
   * 
   * MÉTHODOLOGIE :
   * Simplicité volontaire pour démarrage rapide ou usages non-spécialisés.
   * Basé sur la dichotomie pensée/action.
   * 
   * PHILOSOPHIE :
   * "La simplicité est la sophistication suprême" - Leonardo da Vinci
   * Parfait pour débuter ou pour des besoins basiques.
   * 
   * APPLICATIONS :
   * - Brainstorming : Idées → Actions
   * - Comparaison : Pour → Contre
   * - Processus : Input → Output
   * - Planning : Cette semaine → Semaine prochaine
   * 
   * DIAGRAMME VISUEL :
   * ┌─────────────┬─────────────┐
   * │             │             │
   * │   💡 IDEAS  │ ⚡ ACTIONS  │
   * │             │             │
   * │             │             │
   * │             │             │
   * │             │             │
   * │             │             │
   * │             │             │
   * └─────────────┴─────────────┘
   * 
   * GRILLE TECHNIQUE : 2 colonnes égales, simplicité maximale
   * CAS D'USAGE : Brainstorming, comparaisons, projets simples, démarrage
   */
  layout_simple: [
    { 
      title: "Ideas", 
      x: 0, y: 0, w: 12, h: 24
      // Idées, concepts, possibilités, réflexions
    },
    { 
      title: "Actions", 
      x: 12, y: 0, w: 12, h: 24
      // Actions concrètes, tâches, étapes suivantes
    }
  ],

  // ===========================================================================
  // SECTION 6 : LAYOUTS DE PRISE DE NOTES
  // ===========================================================================

  /**
   * NOTES CORNELL - Système de prise de notes universitaire
   * 
   * MÉTHODOLOGIE :
   * Développé à l'université Cornell par Walter Pauk dans les années 1950.
   * Optimise la prise de notes, la révision et la mémorisation.
   * 
   * PHILOSOPHIE :
   * Structure prédéfinie qui force l'organisation et la synthèse.
   * Séparation claire entre capture, analyse et mémorisation.
   * 
   * ZONES FONCTIONNELLES :
   * 1. Notes principales : Capture du contenu principal
   * 2. Mots-clés/Questions : Indices de révision et concepts clés
   * 3. Résumé : Synthèse personnelle et points clés
   * 
   * PROCESSUS :
   * PENDANT → Prendre des notes dans la zone principale
   * APRÈS → Ajouter mots-clés et questions dans la marge
   * RÉVISION → Utiliser les mots-clés pour réviser
   * SYNTHÈSE → Écrire un résumé personnel
   * 
   * DIAGRAMME VISUEL :
   * ┌────────────────────┬───────┐
   * │                    │       │
   * │     📝 NOTES       │ 🏷️    │
   * │   (Contenu         │ MOTS- │
   * │    principal)      │ CLÉS  │
   * │                    │       │
   * │                    │       │
   * ├────────────────────┴───────┤
   * │      📋 RÉSUMÉ             │
   * │   (Synthèse personnelle)   │
   * └────────────────────────────┘
   * 
   * GRILLE TECHNIQUE : Zone principale + marge + footer
   * CAS D'USAGE : Cours, conférences, lectures, formations
   */
  layout_cornell: [
    { 
      title: "Notes", 
      x: 0, y: 0, w: 16, h: 18
      // Zone principale de prise de notes pendant l'écoute
    },
    { 
      title: "Mots-clés", 
      x: 16, y: 0, w: 8, h: 18
      // Marge pour concepts clés, questions, indices de révision
    },
    { 
      title: "Résumé", 
      x: 0, y: 18, w: 24, h: 6
      // Synthèse personnelle en fin de session
    }
  ],

  // ===========================================================================
  // SECTION 7 : LAYOUTS D'INTÉGRATION AVEC PLUGINS OBSIDIAN
  // ===========================================================================

  /**
   * DASHBOARD TASKS - Intégration avancée avec le plugin Tasks
   * 
   * MÉTHODOLOGIE :
   * Optimisé pour exploiter les capacités du plugin Tasks d'Obsidian.
   * Affichage intelligent des tâches par contexte temporel et projet.
   * 
   * PHILOSOPHIE :
   * Centralisation et contextualisation des tâches pour une vision
   * d'ensemble de la charge de travail.
   * 
   * ZONES TEMPORELLES :
   * - Aujourd'hui : Focus sur l'immédiat
   * - Cette semaine : Vision à court terme
   * - En retard : Gestion des dépassements
   * - Projets actifs : Vision organisationnelle
   * - Statistiques : Métriques et tendances
   * 
   * REQUÊTES TASKS INTÉGRÉES :
   * Utilise la syntaxe du plugin Tasks pour des requêtes dynamiques.
   * 
   * DIAGRAMME VISUEL :
   * ┌─────────┬─────────┬─────────┐
   * │ 📅 AUJ. │📅 SEMN │⚠️ RETARD│
   * │         │         │         │
   * │ tasks   │ tasks   │ tasks   │
   * │ due     │ due     │ due     │
   * │ today   │ this    │ before  │
   * │         │ week    │ today   │
   * ├─────────┴─────────┼─────────┤
   * │  📊 PROJETS       │📈 STATS │
   * │    ACTIFS         │         │
   * │ (par projet)      │(métriq.)│
   * └───────────────────┴─────────┘
   * 
   * REQUÊTES TASKS SUGGÉRÉES :
   * - Aujourd'hui : ```tasks due today not done```
   * - Cette semaine : ```tasks due this week not done```
   * - En retard : ```tasks due before today not done```
   * - Par projet : ```tasks group by project```
   * 
   * GRILLE TECHNIQUE : Vue temporelle + organisation + analytics
   * CAS D'USAGE : Gestion avancée des tâches, productivité, suivi projets
   */
  layout_tasks_dashboard: [
    { 
      title: "Tâches du jour", 
      x: 0, y: 0, w: 8, h: 12
      // ```tasks due today not done```
    },
    { 
      title: "Cette semaine", 
      x: 8, y: 0, w: 8, h: 12
      // ```tasks due this week not done```
    },
    { 
      title: "En retard", 
      x: 16, y: 0, w: 8, h: 12
      // ```tasks due before today not done```
    },
    { 
      title: "Projets actifs", 
      x: 0, y: 12, w: 12, h: 12
      // ```tasks group by project``` ou organisation manuelle
    },
    { 
      title: "Statistiques", 
      x: 12, y: 12, w: 12, h: 12
      // Métriques, tendances, analyse de productivité
    }
  ]
};

// =============================================================================
// MÉTADONNÉES DES LAYOUTS - INFORMATIONS D'AFFICHAGE
// =============================================================================

/**
 * Métadonnées enrichies pour chaque layout
 * 
 * OBJECTIF :
 * Fournir des informations conviviales pour l'interface utilisateur :
 * - Noms d'affichage traduits
 * - Descriptions explicatives
 * - Catégorisation pour l'organisation
 * - Listes des sections pour preview
 * 
 * UTILISATION :
 * Ces métadonnées sont utilisées par LayoutService pour :
 * - Afficher des noms conviviaux dans les menus
 * - Générer des descriptions d'aide
 * - Organiser les layouts par catégorie
 * - Fournir des aperçus des sections
 */
export const LAYOUT_INFO: Record<string, LayoutInfo> = {
  layout_eisenhower: {
    name: "layout_eisenhower",
    displayName: "Matrice d'Eisenhower",
    description: "Système de priorisation basé sur l'urgence et l'importance. Parfait pour la gestion quotidienne et les décisions stratégiques.",
    sections: ["Urgent et Important", "Pas urgent mais Important", "Urgent mais Pas important", "Ni urgent ni important"],
    blockCount: 4,
    category: "productivité"
  },

  layout_gtd: {
    name: "layout_gtd",
    displayName: "Getting Things Done (GTD)",
    description: "Méthode complète de productivité de David Allen. Système d'externalisation de la mémoire et de clarification systématique.",
    sections: ["Inbox", "Actions suivantes", "En attente", "Projets", "Someday Maybe", "Référence"],
    blockCount: 6,
    category: "productivité"
  },

  layout_kanban: {
    name: "layout_kanban",
    displayName: "Tableau Kanban",
    description: "Visualisation du flux de travail avec limitation du travail en cours. Idéal pour le développement et la gestion d'équipe.",
    sections: ["À faire", "En cours", "Terminé"],
    blockCount: 3,
    category: "workflow"
  },

  layout_weekly: {
    name: "layout_weekly",
    displayName: "Planificateur Hebdomadaire",
    description: "Organisation par jour de la semaine avec équilibre travail/repos. Parfait pour la planification personnelle et la coordination d'équipe.",
    sections: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Weekend", "Notes"],
    blockCount: 7,
    category: "planification"
  },

  layout_daily: {
    name: "layout_daily",
    displayName: "Planificateur Quotidien",
    description: "Structure détaillée d'une journée avec focus sur l'apprentissage et la réflexion. Idéal pour le développement personnel.",
    sections: ["Objectifs du jour", "Tâches prioritaires", "Planning", "Notes", "Apprentissages", "Réflexions"],
    blockCount: 6,
    category: "planification"
  },

  layout_project: {
    name: "layout_project",
    displayName: "Gestion de Projet",
    description: "Vue d'ensemble complète d'un projet avec tous les aspects essentiels. Inspiré des méthodologies PMI et Agile.",
    sections: ["Vue d'ensemble", "Objectifs", "Étapes", "Ressources", "Risques", "Suivi"],
    blockCount: 6,
    category: "projet"
  },

  layout_simple: {
    name: "layout_simple",
    displayName: "Board Simple",
    description: "Approche minimaliste à 2 colonnes. Parfait pour débuter ou pour des besoins basiques de brainstorming et comparaison.",
    sections: ["Ideas", "Actions"],
    blockCount: 2,
    category: "basique"
  },

  layout_cornell: {
    name: "layout_cornell",
    displayName: "Notes Cornell",
    description: "Système de prise de notes universitaire optimisant la capture, révision et mémorisation. Développé à Cornell University.",
    sections: ["Notes", "Mots-clés", "Résumé"],
    blockCount: 3,
    category: "notes"
  },

  layout_tasks_dashboard: {
    name: "layout_tasks_dashboard",
    displayName: "Dashboard Tasks",
    description: "Intégration avancée avec le plugin Tasks d'Obsidian. Affichage intelligent des tâches par contexte temporel et projet.",
    sections: ["Tâches du jour", "Cette semaine", "En retard", "Projets actifs", "Statistiques"],
    blockCount: 5,
    category: "intégration"
  }
};