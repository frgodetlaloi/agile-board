export interface BoardLayout {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardModel {
  [modelName: string]: BoardLayout[];
}

export interface FileSection {
  start: number;
  end: number;
  lines: string[];
}

export interface FileSections {
  [sectionName: string]: FileSection;
}

export interface BoardSettings {
  defaultModel: string;
  autoSwitchEnabled: boolean;
  debounceDelay: number;
}