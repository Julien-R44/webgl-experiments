import { Experiment } from '../Experiment'
import * as THREE from 'three'
import { randomVector } from '../utils'
import { Particle, GravityPoint } from './objects'

export class Gravity extends Experiment {
  particles: Particle[] = []
  gravityPoints: GravityPoint[] = []
  parameters = {
    particlesCount: 10,
  }

  constructor() {
    super({
      withOrbitControls: true,
      withMovementBlurPass: true,
      withBloomPass: true,
      cameraOptions: {
        far: 10000,
      },
    })

    this.renderer.setClearColor(0x3b3b3b)
    this.camera.position.set(0, 5, 8)

    this.addParticles()
    this.addGui()

    const light = new THREE.DirectionalLight(0xffffff, 5)
    light.position.set(0, 2, 1)
    this.scene.add(light)

    document
      .querySelector('canvas')
      ?.addEventListener('pointerdown', this.onMouseDown.bind(this), true)
    this.render()
  }

  addGui(): void {
    this.gui.add(this.parameters, 'particlesCount', 0, 1000).onChange(() => {
      this.removeParticles()
      this.addParticles()
    })
  }

  onMouseDown(): void {
    const mouseVectorPos = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
    mouseVectorPos.unproject(this.camera)
    mouseVectorPos.sub(this.camera.position).normalize()
    const distance = -this.camera.position.z / mouseVectorPos.z
    const pos = this.camera.position.clone().add(mouseVectorPos.multiplyScalar(distance))

    const point = new GravityPoint(pos, this)
    this.gravityPoints.push(point)
    this.scene.add(point.mesh)
  }

  removeParticles(): void {
    this.particles.forEach((particle) => this.scene.remove(particle.mesh))
  }

  addParticles(): void {
    const geometry = new THREE.SphereBufferGeometry(0.1, 6, 6)

    for (let i = 0; i < this.parameters.particlesCount; i++) {
      const particle = new Particle(geometry, randomVector().multiplyScalar(0.01))
      this.particles.push(particle)
      this.scene.add(particle.mesh)
    }
  }

  beforeRender(): void {
    this.gravityPoints.forEach((gravityPoint) => gravityPoint.update())
    this.particles.forEach((particle) => particle.update())
  }
}

new Gravity()
