// declarations.d.ts
declare module 'ml-cart' {
  export class DecisionTreeClassifier {
    constructor(options?: { maxDepth?: number; minNumSamples?: number });
    train(features: number[][], labels: number[]): void;
    predict(features: number[][]): number[];
  }
}
