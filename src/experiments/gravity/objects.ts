import * as THREE from 'three'
import { randomFloat, randomVector } from '../../utils'
import { Gravity } from './gravity'

abstract class PhysicBody {
  velocity: THREE.Vector3 = new THREE.Vector3()
  abstract mesh: THREE.Mesh

  constructor(velocity?: THREE.Vector3) {
    if (velocity) {
      this.velocity = velocity
    }
  }

  applyVelocity() {
    this.mesh.position.add(this.velocity)
  }
}

export class Particle extends PhysicBody {
  mesh: THREE.Mesh

  constructor(geometry: THREE.SphereBufferGeometry, velocity: THREE.Vector3) {
    super(velocity)

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      shininess: 100,
    })

    this.mesh = new THREE.Mesh(geometry, material)

    const scale = randomFloat(0.3, 0.7)
    this.mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5)
    this.mesh.scale.set(scale, scale, scale)

    this.mesh.material.color.setRGB(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5)
  }

  update() {
    if (this.velocity.length() > 0.1) {
      this.velocity.normalize().multiply(randomVector().normalize().multiplyScalar(0.1))
    }

    this.applyVelocity()
  }
}

export class GravityPoint extends PhysicBody {
  mesh: THREE.Mesh
  particles: Particle[]
  gravityPoints: GravityPoint[] = []
  experiment: Gravity
  gravity = 0.00001

  constructor(position: THREE.Vector3, experiment: Gravity) {
    super()
    const geometry = new THREE.OctahedronGeometry(0.5, 0)
    const material = new THREE.MeshNormalMaterial({ color: 0x202124, wireframe: false })
    this.mesh = new THREE.Mesh(geometry, material)

    const scale = randomFloat(0.9, 1.1)
    this.mesh.scale.set(scale, scale, scale)

    this.mesh.position.set(position.x, position.y, position.z)

    this.experiment = experiment
    this.particles = this.experiment.particles
    this.gravityPoints = this.experiment.gravityPoints
  }

  update() {
    this.attractParticles()
    this.attractOtherPoints()
    this.absorbPoints()

    this.mesh.position.y += Math.sin(Date.now() * 0.0001) * 0.001
    this.mesh.rotateX(0.01)
    this.mesh.rotateY(0.01)
    this.mesh.rotateZ(0.01)

    this.applyVelocity()
  }

  absorbPoints() {
    const points = this.gravityPoints
    const mesh = this.mesh
    const position = mesh.position

    for (let i = 0; i < points.length; i++) {
      const point = points[i]

      if (this === point || point.mesh.scale.x > this.mesh.scale.x) continue
      const distance = position.clone().sub(point.mesh.position).length()

      if (distance < 0.5) {
        this.absorbPoint(point)
      }
    }
  }

  absorbPoint(point: GravityPoint) {
    this.gravityPoints.splice(this.gravityPoints.indexOf(point), 1)

    const { x, y, z } = this.mesh.scale.clone().multiplyScalar(1.4)
    gsap.gsap.to(this.mesh.scale, { x, y, z, duration: 2, ease: gsap.Power4.easeOut })
    this.gravity *= 2
    this.experiment.scene.remove(point.mesh)
    this.velocity = new THREE.Vector3(0, 0, 0)
  }

  attractOtherPoints() {
    const points = this.gravityPoints
    const mesh = this.mesh
    const position = mesh.position

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      point.velocity.add(
        position.clone().sub(point.mesh.position).normalize().multiplyScalar(this.gravity)
      )
    }
  }

  attractParticles() {
    const particles = this.particles
    const mesh = this.mesh
    const position = mesh.position

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i]
      particle.velocity.add(
        position
          .clone()
          .sub(particle.mesh.position)
          .normalize()
          .multiplyScalar(this.gravity * 100)
      )
    }
  }
}
