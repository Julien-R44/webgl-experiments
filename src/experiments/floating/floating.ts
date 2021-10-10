import * as THREE from 'three'
import { Experiment } from '../Experiment'

interface SceneObject {
  initialPosition: THREE.Vector3
  mesh: THREE.Mesh
  random: number
}
class FloatingExperiment extends Experiment {
  sceneObjects: SceneObject[] = []
  lightMouse!: THREE.PointLight

  constructor() {
    super({
      withOrbitControls: true,
      withBloomPass: true,
    })

    this.camera.position.z = 7
    this.addLights()
    this.createRandomMeshes()
    this.render()
  }

  addLights() {
    const lightIntensity = 1

    const lightRed = new THREE.PointLight(0xe30056, lightIntensity, 100)
    lightRed.position.set(5, 5, 5)
    this.scene.add(lightRed)

    this.lightMouse = new THREE.PointLight(0x00aff2, lightIntensity, 100)
    this.lightMouse.position.set(0, 0, 5)
    this.scene.add(this.lightMouse)
  }

  createRandomMeshes() {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
    const sphereGeometry = new THREE.SphereGeometry(1, 12, 12)
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32)
    const torusGeometry = new THREE.TorusGeometry(1, 0.3, 32, 100)
    const torusKnotGeometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16)
    const octahedronGeometry = new THREE.OctahedronGeometry(1, 0)
    const icosahedronGeometry = new THREE.IcosahedronGeometry(1, 0)
    const material = new THREE.MeshLambertMaterial()

    for (let i = 0; i < 2000; i++) {
      const availableGeometries = [
        boxGeometry,
        sphereGeometry,
        cylinderGeometry,
        torusGeometry,
        // torusKnotGeometry,
        octahedronGeometry,
        icosahedronGeometry,
      ]

      const geometry = availableGeometries[Math.floor(Math.random() * availableGeometries.length)]
      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.x = Math.random() * 20 - 10
      mesh.position.y = Math.random() * 20 - 10
      mesh.position.z = Math.random() * 20 - 10

      mesh.rotation.x = Math.random() * Math.PI * 2
      mesh.rotation.y = Math.random() * Math.PI * 2

      const scale = Math.random() * 0.4
      mesh.scale.set(scale, scale, scale)

      this.sceneObjects.push({
        initialPosition: mesh.position.clone(),
        mesh,
        random: Math.random() * 10,
      })
      this.scene.add(mesh)
    }
  }

  beforeRender() {
    const t = this.clock.getElapsedTime()

    this.sceneObjects.forEach((object) => {
      object.mesh.position.y += Math.sin(object.random + t) * 0.005
    })

    const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
    vector.unproject(this.camera)
    const dir = vector.sub(this.camera.position).normalize()
    const distance = -this.camera.position.z / dir.z
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance))

    this.lightMouse.position.lerp(pos, 0.1)
  }
}

new FloatingExperiment()
