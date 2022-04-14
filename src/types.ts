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

export type Node<N extends InputNode> = N & {
  index: number;
  degree: number;
  outdegree: number;
  indegree: number;
}

export type Link<N extends InputNode, L extends InputLink> = L & {
  from: number;
  to: number;
  source: Node<N>;
  target: Node<N>;
}
