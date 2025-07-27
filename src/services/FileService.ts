import { App, TFile } from 'obsidian';
import { FileSections, BoardLayout } from '../../types';

export class FileService {
  constructor(private app: App) {}

  async parseSections(file: TFile): Promise<FileSections> {
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const sections: FileSections = {};
    
    let currentSection: string | null = null;
    let sectionStart = 0;

    console.log('📖 Parsing sections du fichier:', file.basename);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^# ([^\n#].*?)\s*$/);
      
      if (headerMatch) {
        // Sauvegarder la section précédente
        if (currentSection !== null) {
          const sectionLines = lines.slice(sectionStart + 1, i);
          sections[currentSection] = {
            start: sectionStart,
            end: i,
            lines: sectionLines
          };
          console.log(`📄 Section "${currentSection}": ${sectionLines.length} lignes`);
        }
        
        // Commencer nouvelle section
        currentSection = headerMatch[1].trim();
        sectionStart = i;
      }
    }

    // Sauvegarder la dernière section
    if (currentSection !== null) {
      const sectionLines = lines.slice(sectionStart + 1);
      sections[currentSection] = {
        start: sectionStart,
        end: lines.length,
        lines: sectionLines
      };
      console.log(`📄 Section "${currentSection}": ${sectionLines.length} lignes`);
    }

    console.log('✅ Sections trouvées:', Object.keys(sections));
    return sections;
  }

  async createMissingSections(file: TFile, layout: BoardLayout[]): Promise<boolean> {
    console.log('🔧 Vérification des sections manquantes...');
    
    const sections = await this.parseSections(file);
    const existingSections = Object.keys(sections);
    const requiredSections = layout.map(block => block.title);
    const missingSections = requiredSections.filter(section => !existingSections.includes(section));

    if (missingSections.length === 0) {
      console.log('✅ Toutes les sections sont présentes');
      return false;
    }

    console.log('📝 Sections manquantes détectées:', missingSections);
    
    // Lire le contenu actuel
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');

    // Trouver où insérer les nouvelles sections
    const insertionPoint = this.findInsertionPoint(lines);
    
    // Créer les nouvelles sections
    const newSectionLines: string[] = [];
    for (const sectionTitle of missingSections) {
      newSectionLines.push('');  // Ligne vide avant la section
      newSectionLines.push(`# ${sectionTitle}`);
      newSectionLines.push('');  // Ligne vide après le titre
    }

    // Insérer les nouvelles sections
    const updatedLines = [
      ...lines.slice(0, insertionPoint),
      ...newSectionLines,
      ...lines.slice(insertionPoint)
    ];

    // Sauvegarder le fichier modifié
    await this.app.vault.modify(file, updatedLines.join('\n'));
    
    console.log(`✅ ${missingSections.length} sections ajoutées:`, missingSections);
    return true;
  }

  private findInsertionPoint(lines: string[]): number {
    // Chercher la fin du frontmatter YAML
    let frontmatterEnd = 0;
    let inFrontmatter = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (i === 0 && line === '---') {
        inFrontmatter = true;
        continue;
      }
      
      if (inFrontmatter && line === '---') {
        frontmatterEnd = i + 1;
        break;
      }
    }

    // Si pas de frontmatter, insérer au début
    if (frontmatterEnd === 0) {
      return 0;
    }

    // Sinon, insérer après le frontmatter
    return frontmatterEnd;
  }

  async updateSection(file: TFile, sectionName: string, newContent: string): Promise<void> {
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const sections = await this.parseSections(file);
    const section = sections[sectionName];
    
    if (!section) return;

    const newLines = [
      ...lines.slice(0, section.start + 1),
      ...newContent.split('\n'),
      ...lines.slice(section.end)
    ];

    await this.app.vault.modify(file, newLines.join('\n'));
  }

  getMissingSections(existingSections: string[], requiredSections: string[]): string[] {
    return requiredSections.filter(section => !existingSections.includes(section));
  }
}