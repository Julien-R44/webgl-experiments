import { Experiment } from '../Experiment'
import { BaseScene } from '../plugins/BaseScene'
import { Sky } from '../plugins/Sky'
import * as THREE from 'three'
import noise from 'simplenoise'
import { MathUtils } from 'three'
import { DOF } from '../plugins/DOF'

const PLANE_SUBDIV = 400
class Water extends Experiment {
  planeGeometry!: THREE.PlaneBufferGeometry
  planeMesh!: THREE.Mesh
  parameters = {
    speed: 0.5,
    amplitude: 7,
    noiseSize: 32,
    topColor: 0xff0000,
    bottomColor: 0x90909,
    noiseType: 'simplex3',
  }

  constructor() {
    super({ withOrbitControls: true, withFpsCounter: true, cameraOptions: { far: 10000 } })

    noise.seed(Math.random())

    this.addLightAndSky()
    this.createPlane()

    this.camera.position.set(0, 30, 180)
    this.camera.lookAt(0, 0, 0)

    this.render()
    this.addGui()
  }

  addLightAndSky() {
    const sky = new Sky(this, {
      mieDirectionalG: 0.9,
      elevation: 3.5,
      azimuth: -180,
      exposure: 0.14,
    })

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(0, 2, 1)
    this.scene.add(light)

    this.scene.fog = new THREE.Fog(0x565b5e, 0, 1000)
  }

  createPlane() {
    this.planeGeometry = new THREE.PlaneBufferGeometry(400, 400, PLANE_SUBDIV, PLANE_SUBDIV)
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 0,
      vertexColors: true,
      side: THREE.DoubleSide,
      wireframe: false,
    })

    this.planeMesh = new THREE.Mesh(this.planeGeometry, material)

    this.planeMesh.rotation.x = -Math.PI / 2
    this.planeMesh.position.y = 0
    this.planeMesh.position.set(0, 0, 0)
    this.scene.add(this.planeMesh)
  }

  addGui() {
    this.gui.add(this.planeMesh.material, 'wireframe')
    this.gui.add(this.parameters, 'speed').min(0).max(10).step(0.01)
    this.gui.add(this.parameters, 'amplitude').min(0).max(50).step(0.01)
    this.gui.add(this.parameters, 'noiseSize').min(0).max(100).step(0.01)
    this.gui.add(this.parameters, 'noiseType', { Simplex: 'simplex3', Perlin: 'perlin3' })
    this.gui.addColor(this.parameters, 'bottomColor')
    this.gui.addColor(this.parameters, 'topColor')
  }

  beforeRender() {
    this.updateVertexPositions()
    this.updateVertexColors()
  }

  updateVertexPositions() {
    const speed = this.clock.getElapsedTime() * this.parameters.speed
    const position = this.planeMesh.geometry.attributes.position
    const size = this.parameters.noiseSize
    const noiseType = this.parameters.noiseType

    for (let i = 0; i < position.count * 3; i += 3) {
      const x = position.array[i]
      const y = position.array[i + 1]
      const value = noise[noiseType](x / size + speed, y / size + speed, speed)

      position.array[i + 2] = value * this.parameters.amplitude
    }
    this.planeGeometry.attributes.position.needsUpdate = true
  }

  updateVertexColors() {
    const colors = []
    const color = new THREE.Color(this.parameters.topColor)
    const scolor = new THREE.Color(this.parameters.bottomColor)
    const positionAttribute = this.planeGeometry.attributes.position

    for (let i = 0, il = positionAttribute.count; i < il; i++) {
      const y = positionAttribute.array[i * 3 + 2]

      const mixedColor = scolor.clone().lerp(color, MathUtils.clamp(y / 14, 0, 1))
      colors.push(mixedColor.r, mixedColor.g, mixedColor.b)
    }

    this.planeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.planeGeometry.attributes.color.needsUpdate = true
  }
}

new Water()
