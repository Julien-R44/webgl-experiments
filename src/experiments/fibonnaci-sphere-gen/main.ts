import { Experiment } from '../Experiment'
import * as THREE from 'three'
import gsap from 'gsap'
import * as iDelaunay from 'd3-delaunay'
const Delaunay = iDelaunay.Delaunay

class SphereGen extends Experiment {
  meshes: THREE.Mesh[] = []
  parameters = {
    jitter: 0,
    samples: 700,
    animationSpeed: 1,
  }

  constructor() {
    super({
      withOrbitControls: true,
      withIcoBackground: true,
      withFpsCounter: true,
      defaultBloomParams: {
        bloomThreshold: 0.7,
      },
      withBloomPass: true,
      cameraOptions: {
        far: 10000,
      },
    })

    // new BaseScene(this)

    this.camera.position.set(0, 5, 5)
    this.camera.lookAt(0, 0, 0)

    const light = new THREE.PointLight(0xffffff, 1, 100)
    light.position.set(0, 5, 5)
    this.scene.add(light)

    this.init()
    this.addGui()
    this.render()
  }

  async init() {
    const points = this.computeFibonnaciSpherePointsPositions()
    this.meshes = await this.createSphereMesh(points)
    const projectedPoints = await this.makeStereographicProjection(points, this.meshes)
    this.createDelaunayTriangulation(projectedPoints, points)
  }

  clear() {
    this.meshes.forEach((mesh) => {
      this.scene.remove(mesh)
    })
  }

  reset() {
    this.clear()
    this.init()
  }

  async createDelaunayTriangulation(points: [number, number][], originalPoints: Float32Array) {
    const flatPoints = points.filter(([x, y]) => !isNaN(x) && !isNaN(y)).flat()
    const delaunay = Delaunay.from(points)
    const triangles = delaunay.triangles

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(originalPoints, 3))
    const mat = new THREE.MeshNormalMaterial({ wireframe: false, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geom, mat)

    const meshIndex = []
    for (let i = 0; i < triangles.length; i++) {
      meshIndex.push(delaunay.triangles[i])
    }

    geom.setIndex(meshIndex)
    geom.computeVertexNormals()

    for (let i = 0; i < this.meshes.length; i++) {
      const x = originalPoints[i * 3]
      const y = originalPoints[i * 3 + 1]
      const z = originalPoints[i * 3 + 2]

      gsap.to(this.meshes[i].position, {
        x,
        y,
        z,
        duration: 0.1,
        delay: i * 0.001 * this.parameters.animationSpeed,
      })
    }

    this.scene.add(mesh)
  }

  async makeStereographicProjection(points: Float32Array, meshes: THREE.Mesh[]) {
    const projectedPoints = []
    const promises = []

    for (let i = 0; i < points.length; i += 3) {
      const x = points[i]
      const y = points[i + 1]
      const z = points[i + 2]
      const cube = meshes[i / 3]

      const projectedX = x / (1 - y)
      const projectedZ = z / (1 - y)

      projectedPoints.push([projectedX, projectedZ])

      const promise = gsap.to(cube.position, {
        x: projectedX,
        z: projectedZ,
        y: 0,
        delay: i * 0.001 * this.parameters.animationSpeed,
        duration: 0.1,
      })

      promises.push(promise)
    }

    await Promise.all(promises)
    return projectedPoints
  }

  async createSphereMesh(points: Float32Array): Promise<THREE.Mesh[]> {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const cubeMaterial = new THREE.MeshNormalMaterial()
    const meshes = []
    const promises = []

    for (let i = 0; i < points.length; i += 3) {
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
      cube.scale.multiplyScalar(0.03)

      meshes.push(cube)
      this.scene.add(cube)

      const promise = gsap.to(cube.position, {
        x: points[i],
        y: points[i + 1],
        z: points[i + 2],
        delay: i * 0.001 * this.parameters.animationSpeed,
        duration: 0.1,
      })
      promises.push(promise)
    }
    await Promise.all(promises)
    return meshes
  }

  computeFibonnaciSpherePointsPositions(): Float32Array {
    const samples = this.parameters.samples
    const vertices = new Float32Array(samples * 3)
    const phi = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = phi * i

      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      vertices[i * 3] = x
      vertices[i * 3 + 1] = y + 2
      vertices[i * 3 + 2] = z
    }
    return vertices
  }

  addGui() {
    const fn = this.reset.bind(this)
    this.gui.add(this.parameters, 'animationSpeed').min(0.01).max(10)
  }
}

new SphereGen()
