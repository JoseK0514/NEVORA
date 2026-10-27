export type RenderedContrast = {
  ratio: number;
  samples: readonly {
    foreground: readonly number[];
    background: readonly number[];
    ratio: number;
  }[];
  layers: readonly unknown[];
  method: string;
};

export function measureRenderedContrast(element: Element): RenderedContrast;
