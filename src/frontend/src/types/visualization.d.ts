export interface NetworkNode {
  id: string;
  type: 'constitution' | 'case_law' | 'treaty' | 'court';
  description?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface BarChartData {
  legalSystem: string;
  count: number;
}

export interface VisualizationProps {
  data: NetworkData | BarChartData[];
  width?: number;
  height?: number;
}