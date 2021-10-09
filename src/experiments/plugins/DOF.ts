import { Experiment } from '../Experiment'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'

export interface DofOptions {
  focus: number
  aperture: number
  maxblur: number
  width: number
  height: number
  enabled: boolean
}

const defaultOptions: DofOptions = {
  enabled: true,
  focus: 500.0,
  aperture: 5,
  maxblur: 0.01,
  width: window.innerWidth,
  height: window.innerHeight,
}

export class DOF {
  experiment: Experiment
  bokehPass: BokehPass
  options: DofOptions

  constructor(experiment: Experiment, options: Partial<DofOptions> = {}) {
    this.experiment = experiment
    this.options = {
      ...defaultOptions,
      ...options,
    }

    this.bokehPass = new BokehPass(this.experiment.scene, this.experiment.camera, this.options)

    this.experiment.composer.addPass(this.bokehPass)
    this.addGui()
  }

  addGui() {
    const matChanger = () => {
      this.bokehPass.enabled = this.options.enabled
      this.bokehPass.uniforms['focus'].value = this.options.focus
      this.bokehPass.uniforms['aperture'].value = this.options.aperture * 0.00001
      this.bokehPass.uniforms['maxblur'].value = this.options.maxblur
    }

    const gui = this.experiment.gui
    const folder = gui.addFolder('DOF')
    folder.add(this.options, 'focus', 10.0, 3000.0, 10).onChange(matChanger)
    folder.add(this.options, 'aperture', 0, 10, 0.1).onChange(matChanger)
    folder.add(this.options, 'maxblur', 0.0, 0.01, 0.001).onChange(matChanger)
    folder.add(this.options, 'enabled').onChange(matChanger)
  }
}
