import * as THREE from 'three'

export function gradTexture(color: any): THREE.Texture {
  const c = document.createElement('canvas')
  const ct = c.getContext('2d')
  if (!ct) {
    throw new Error('gradTexture: Canvas not supported')
  }
  c.width = 16
  c.height = 256
  const gradient = ct.createLinearGradient(0, 0, 0, 256)
  let i = color[0].length
  while (i--) {
    gradient.addColorStop(color[0][i], color[1][i])
  }
  ct.fillStyle = gradient
  ct.fillRect(0, 0, 16, 256)
  const texture = new THREE.Texture(c)
  texture.needsUpdate = true
  return texture
}

export function basicTexture(n): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('basicTexture: Canvas not supported')
  const colors = []
  if (n === 0) {
    // sphere
    colors[0] = '#58AA80'
    colors[1] = '#58FFAA'
  }
  if (n === 1) {
    // sphere sleep
    colors[0] = '#383838'
    colors[1] = '#38AA80'
  }
  if (n === 2) {
    // box
    colors[0] = '#AA8058'
    colors[1] = '#FFAA58'
  }
  if (n === 3) {
    // box sleep
    colors[0] = '#383838'
    colors[1] = '#AA8038'
  }
  ctx.fillStyle = colors[0]
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = colors[1]
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillRect(32, 32, 32, 32)

  const tx = new THREE.Texture(canvas)
  tx.needsUpdate = true
  return tx
}

export function convertFloat32ArrayToVector3(array: ArrayLike<number>): THREE.Vector3[] {
  const vecs = []
  for (let i = 0; i < array.length; i += 3) {
    const vec = new THREE.Vector3(array[i], array[i + 1], array[i + 2])
    vecs.push(vec)
  }
  return vecs.filter((vector) => vector.x != 0 && vector.y != 0 && vector.z != 0)
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randomVector(): THREE.Vector3 {
  return new THREE.Vector3(randomFloat(-1, 1), randomFloat(-1, 1), randomFloat(-1, 1))
}
