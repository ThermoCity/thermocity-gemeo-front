import type { SetorFeature } from '../../types'

/**
 * Projeção equiretangular simples (suficiente para um município): x = lon·cos(lat₀), y = −lat.
 * Coordenadas em graus (SIRGAS 2000), multiplicadas por ESCALA para trabalhar em "pixels".
 */
const ESCALA = 10000
const LAT_REF = -22.12
const COS = Math.cos((LAT_REF * Math.PI) / 180)

export const projetar = (lon: number, lat: number): [number, number] => [lon * COS * ESCALA, -lat * ESCALA]

export interface Caixa {
  x: number
  y: number
  w: number
  h: number
}

export function caminhoSetor(f: SetorFeature): string {
  return f.geometry.coordinates
    .map((poligono) =>
      poligono
        .map((anel) => anel.map(([lon, lat], i) => `${i ? 'L' : 'M'}${projetar(lon, lat).map((v) => v.toFixed(1)).join(' ')}`).join('') + 'Z')
        .join(''),
    )
    .join('')
}

export function caixaDe(features: SetorFeature[]): Caixa {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const f of features)
    for (const poligono of f.geometry.coordinates)
      for (const [lon, lat] of poligono[0]) {
        const [x, y] = projetar(lon, lat)
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Metros por unidade projetada (1 grau de latitude ≈ 111,32 km). */
export const METROS_POR_UNIDADE = 111320 / ESCALA
