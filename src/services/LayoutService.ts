import { Plugin } from 'obsidian';
import { BoardLayout, LayoutInfo } from '../types';
import { BUILT_IN_LAYOUTS, LAYOUT_INFO } from '../constants/layouts';

export class LayoutService {
  private models = new Map<string, BoardLayout[]>();
  
  constructor(private plugin: Plugin) {}

  load(): void {
    console.log('📐 Chargement des layouts intégrés...');
    
    this.models.clear();
    let loadedCount = 0;

    for (const [name, layout] of Object.entries(BUILT_IN_LAYOUTS)) {
      console.log(`🔍 Chargement du layout "${name}"...`);
      
      if (this.validateModel(name, layout)) {
        this.models.set(name, layout);
        loadedCount++;
        console.log(`✅ Layout "${name}" chargé (${layout.length} blocs)`);
      } else {
        console.warn(`❌ Modèle "${name}" invalide`);
      }
    }

    console.log(`📐 ${loadedCount} layouts chargés`);
    this.logAvailableLayouts();
  }

  private validateModel(name: string, layout: BoardLayout[]): boolean {
    const grid = Array.from({ length: 24 }, () => Array(100).fill(false));
    let isValid = true;

    for (const block of layout) {
      if (!this.isValidBlock(block)) {
        console.warn(`❌ [${name}] Bloc invalide :`, block);
        isValid = false;
        continue;
      }

      if (!this.isBlockInBounds(block)) {
        console.warn(`❌ [${name}] Bloc hors limites :`, block);
        isValid = false;
        continue;
      }

      if (!this.checkOverlap(grid, block, name)) {
        isValid = false;
      }
    }

    return isValid;
  }

  private isValidBlock(block: any): block is BoardLayout {
    return (
      typeof block.title === 'string' &&
      typeof block.x === 'number' &&
      typeof block.y === 'number' &&
      typeof block.w === 'number' &&
      typeof block.h === 'number'
    );
  }

  private isBlockInBounds(block: BoardLayout): boolean {
    return (
      block.x >= 0 &&
      block.y >= 0 &&
      block.w > 0 &&
      block.h > 0 &&
      block.x + block.w <= 24 &&
      block.y + block.h <= 100
    );
  }

  private checkOverlap(grid: boolean[][], block: BoardLayout, modelName: string): boolean {
    for (let x = block.x; x < block.x + block.w; x++) {
      for (let y = block.y; y < block.y + block.h; y++) {
        if (grid[x][y]) {
          console.warn(`❌ [${modelName}] Chevauchement détecté au bloc "${block.title}" à (${x}, ${y})`);
          return false;
        }
        grid[x][y] = true;
      }
    }
    return true;
  }

  private logAvailableLayouts(): void {
    const layouts = Array.from(this.models.keys());
    console.log('📋 Layouts disponibles:', layouts);
    
    // Afficher les détails de chaque layout
    for (const [name, layout] of this.models) {
      const sections = layout.map(b => b.title).join(', ');
      console.log(`  • ${name}: ${layout.length} sections (${sections})`);
    }
  }

  getModel(name: string): BoardLayout[] | undefined {
    return this.models.get(name);
  }

  getAllModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  getLayoutDisplayName(layoutName: string): string {
    const layoutInfo = LAYOUT_INFO[layoutName];
    return layoutInfo ? layoutInfo.displayName : layoutName;
  }

  getModelInfo(name: string): LayoutInfo | undefined {
    const model = this.models.get(name);
    if (!model) return undefined;

    const info = LAYOUT_INFO[name];
    return info || {
      name,
      displayName: name,
      description: 'Layout personnalisé',
      sections: model.map(block => block.title),
      blockCount: model.length,
      category: 'custom'
    };
  }

  getAllModelsInfo(): LayoutInfo[] {
    return Array.from(this.models.keys())
      .map(name => this.getModelInfo(name)!)
      .filter(info => info !== undefined);
  }
}