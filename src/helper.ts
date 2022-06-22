import { color as d3Color } from 'd3-color'
import regl from 'regl'
import { ColorAccessor, NumericAccessor, StringAccessor } from './config'

function isFunction (value: unknown): boolean {
  return typeof value === 'function'
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
