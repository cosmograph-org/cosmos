export type InputNode = {
  [key: string]: unknown;
  id: string;
  x?: number;
  y?: number;
}

export type InputLink = {
  [key: string]: unknown;
  source: string;
  target: string;
}
