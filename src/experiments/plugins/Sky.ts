import { Experiment } from '../Experiment'
import * as THREE from 'three'
import { Sky as ThreeSky } from 'three/examples/jsm/objects/Sky.js'

export interface SkyOptions {
  turbidity: number
  rayleigh: number
  mieCoefficient: number
  mieDirectionalG: number
  elevation: number
  azimuth: number
  exposure: number
}

const defaultOptions: SkyOptions = {
  turbidity: 10,
  rayleigh: 3,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.7,
  elevation: 2,
  azimuth: 180,
  exposure: 0.5,
}

export class Sky {
  experiment: Experiment
  sky: ThreeSky
  sun: THREE.Vector3
  options: SkyOptions

  constructor(experiment: Experiment, options: Partial<SkyOptions> = defaultOptions) {
    this.experiment = experiment
    this.options = { ...defaultOptions, ...options }

    this.sky = new ThreeSky()
    this.sky.scale.setScalar(450000)
    this.experiment.scene.add(this.sky)

    this.sun = new THREE.Vector3()

    this.experiment.renderer.outputEncoding = THREE.sRGBEncoding
    this.experiment.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.experiment.renderer.toneMappingExposure = 0.5

    this.addGui()
  }

  private addGui() {
    const gui = this.experiment.gui
    const options = this.options

    const fn = this.onGuiChanged.bind(this)

    const folder = gui.addFolder('Sky')
    folder.add(options, 'turbidity', 0.0, 20.0, 0.1).onChange(fn)
    folder.add(options, 'rayleigh', 0.0, 4, 0.001).onChange(fn)
    folder.add(options, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(fn)
    folder.add(options, 'mieDirectionalG', 0.0, 1, 0.001).onChange(fn)
    folder.add(options, 'elevation', 0, 90, 0.1).onChange(fn)
    folder.add(options, 'azimuth', -180, 180, 0.1).onChange(fn)
    folder.add(options, 'exposure', 0, 1, 0.0001).onChange(fn)

    fn()
  }

  private onGuiChanged() {
    const options = this.options

    const uniforms = this.sky.material.uniforms
    uniforms['turbidity'].value = options.turbidity
    uniforms['rayleigh'].value = options.rayleigh
    uniforms['mieCoefficient'].value = options.mieCoefficient
    uniforms['mieDirectionalG'].value = options.mieDirectionalG

    const phi = THREE.MathUtils.degToRad(90 - options.elevation)
    const theta = THREE.MathUtils.degToRad(options.azimuth)

    this.sun.setFromSphericalCoords(1, phi, theta)

    uniforms['sunPosition'].value.copy(this.sun)

    this.experiment.renderer.toneMappingExposure = options.exposure
    this.experiment.renderer.render(this.experiment.scene, this.experiment.camera)
  }
}
