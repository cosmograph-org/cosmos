import { color as d3Color } from 'd3-color'
import regl from 'regl'
import { ColorAccessor, NumericAccessor, StringAccessor } from './config'
import { InputNode, InputLink } from './types'
import 'btoa';

function isFunction (value: unknown): boolean {
  return typeof value === 'function'
}

export async function getTigerGraphData(vertex_type: string, edge_type: string, host:string, graphname: string, username: string, password: string) : Promise<[InputNode[], InputLink[]] | readonly [InputNode[], InputLink[]]> {
  return fetch(`${host}:14240/gsqlserver/interpreted_query?vertex_type=${vertex_type}&edge_type=${edge_type}`, {
      method: 'POST',
      body: `INTERPRET QUERY (STRING vertex_type, STRING edge_type) FOR GRAPH ${graphname} {
        ListAccum<EDGE> @@edges;
        docs = {vertex_type.*};
        Res = SELECT d FROM docs:d - (edge_type:e) -> vertex_type:d2
                ACCUM @@edges += e;
        PRINT docs;
        PRINT @@edges AS edges;
      }`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic '+btoa(`${username}:${password}`),
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }
  
      return response.json();
    }).then(data => {

      const links: InputLink[] = [];
      const nodes: InputNode[] = [];

      console.log(data);

      let vertices = data.results[0]["docs"];
      let edges = data.results[1]["edges"];
      for (let vertex in vertices) nodes.push({id: `${vertices[vertex].v_id}`});
      for (let edge in edges) links.push({ source: `${edges[edge].from_id}`, target: `${edges[edge].to_id}`});

      return [nodes, links] as const;
    });
}

export function getValue<T, ReturnType> (
  d: T,
  accessor: NumericAccessor<T> | StringAccessor<T> | ColorAccessor<T>,
  index?: number
): ReturnType | null | undefined {
  // eslint-disable-next-line @typescript-eslint/ban-types
  if (isFunction(accessor)) return (accessor as Function)(d, index) as (ReturnType | null | undefined)
  else return accessor as unknown as (ReturnType | null | undefined)
}

export function getString<T> (d: T, accessor: StringAccessor<T>, i?: number): string | null | undefined {
  return getValue<T, string>(d, accessor, i)
}

export function getNumber<T> (d: T, accessor: NumericAccessor<T>, i?: number): number | null | undefined {
  return getValue<T, number>(d, accessor, i)
}

export function getRgbaColor (value: string | [number, number, number, number]): [number, number, number, number] {
  let rgba: [number, number, number, number]
  if (Array.isArray(value)) {
    rgba = value
  } else {
    const color = d3Color(value)
    const rgb = color?.rgb()
    rgba = [rgb?.r || 0, rgb?.g || 0, rgb?.b || 0, color?.opacity ?? 1]
  }

  return [
    rgba[0] / 255,
    rgba[1] / 255,
    rgba[2] / 255,
    rgba[3],
  ]
}

export function readPixels (reglInstance: regl.Regl, fbo: regl.Framebuffer2D): Float32Array {
  let resultPixels = new Float32Array()
  reglInstance({ framebuffer: fbo })(() => {
    resultPixels = reglInstance.read()
  })

  return resultPixels
}

export function group <ArrayItem, Key> (array: ArrayItem[], accessor: (d: ArrayItem) => Key): Map<Key, ArrayItem[]> {
  const groups = new Map<Key, ArrayItem[]>()
  array.forEach(item => {
    const key = accessor(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  })
  return groups
}

export function getRandomValue (min: number, max: number): number {
  return Math.random() * (max - min) + min
}
