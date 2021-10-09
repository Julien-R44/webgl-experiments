import * as THREE from 'three'
import { Experiment } from '../Experiment'

export class BaseScene {
  experiment: Experiment

  constructor(experiment: Experiment) {
    this.experiment = experiment

    this.addLight()
    this.addCube()
  }

  private addCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)

    this.experiment.scene.add(cube)
  }

  private addLight() {
    const light = new THREE.PointLight(0xffffff, 1, 100)
    light.position.set(0, 0, 5)
    this.experiment.scene.add(light)
  }
}
