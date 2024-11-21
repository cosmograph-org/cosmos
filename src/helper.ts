import { color as d3Color } from 'd3-color'
import regl from 'regl'

export const isFunction = <T>(a: T): boolean => typeof a === 'function'
export const isArray = <T>(a: unknown | T[]): a is T[] => Array.isArray(a)
export const isObject = <T>(a: T): boolean => (a instanceof Object)
export const isAClassInstance = <T>(a: T): boolean => {
  if (a instanceof Object) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return (a as T & Object).constructor.name !== 'Function' && (a as T & Object).constructor.name !== 'Object'
  } else return false
}
export const isPlainObject = <T>(a: T): boolean => isObject(a) && !isArray(a) && !isFunction(a) && !isAClassInstance(a)

export function getRgbaColor (value: string | [number, number, number, number]): [number, number, number, number] {
  let rgba: [number, number, number, number]
  if (isArray(value)) {
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

export function clamp (num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max)
}

export function isNumber (value: number | undefined | null | typeof NaN): boolean {
  return value !== undefined && value !== null && !Number.isNaN(value)
}
