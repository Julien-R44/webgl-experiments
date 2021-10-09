import * as THREE from 'three'
import { Experiment } from '../Experiment'

class Galaxy extends Experiment {
  points!: THREE.Points
  starPoints!: THREE.Points
  geometry!: THREE.BufferGeometry
  starGeometry!: THREE.BufferGeometry
  material!: THREE.PointsMaterial
  starMaterial!: THREE.PointsMaterial
  parameters = {
    starsCount: 16000,
    count: 9000,
    branches: 7,
    radius: 5,
    spin: 1.15,
    randomness: 0.29,
    randomnessPower: 4.8,
    insideColor: '#ff6030',
    outsideColor: '#1b3984',
    starColorA: '#ffffff',
    starColorB: '#c300ff',
    starColorC: '#efff00',
    starColorD: '#ff0e00',
  }

  constructor() {
    super({
      withOrbitControls: true,
      withBloomPass: true,
      defaultBloomParams: {
        bloomThreshold: 0,
        bloomStrength: 2.8,
        bloomRadius: 0.6,
        exposure: 0.5,
      },
    })

    this.renderer.setClearColor(0x000000)
    this.controls.enableDamping = true

    this.camera.position.set(0, 2, 5)

    this.addLight()
    this.generateGalaxy()
    this.addGuiParams()

    this.render()
  }

  addLight() {
    const light = new THREE.PointLight(0xffffff, 1, 100)
    light.position.set(0, 0, 10)
    this.scene.add(light)
  }

  generateGalaxy() {
    if (this.points != null) {
      this.geometry.dispose()
      this.material.dispose()
      this.starGeometry.dispose()
      this.starMaterial.dispose()
      this.scene.remove(this.points)
      this.scene.remove(this.starPoints)
    }

    const parameters = this.parameters
    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(parameters.count * 3)
    const colors = new Float32Array(parameters.count * 3)

    const colorInside = new THREE.Color(parameters.insideColor)
    const colorOutside = new THREE.Color(parameters.outsideColor)

    for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3

      const radius = Math.random() * parameters.radius
      const spinAngle = radius * parameters.spin
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2

      const randomX =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius
      const randomY =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius
      const randomZ =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX
      positions[i3 + 1] = randomY
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ

      // Color
      const mixedColor = colorInside.clone()
      mixedColor.lerp(colorOutside, radius / parameters.radius)

      colors[i3] = mixedColor.r
      colors[i3 + 1] = mixedColor.g
      colors[i3 + 2] = mixedColor.b
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.geometry.translate(0, 1, 0)
    this.geometry.rotateZ(0.1)

    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)

    this.starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(parameters.starsCount * 3)
    const starColors = new Float32Array(parameters.count * 3)

    for (let i = 0; i < parameters.starsCount; i++) {
      const i3 = i * 3

      starPositions[i3] = (Math.random() * 2 - 1) * 50
      starPositions[i3 + 1] = (Math.random() * 2 - 1) * 15
      starPositions[i3 + 2] = (Math.random() * 2 - 1) * 50

      const colorsParameters = [
        parameters.starColorA,
        parameters.starColorB,
        parameters.starColorC,
        parameters.starColorD,
      ]

      const colorString = colorsParameters[Math.floor(Math.random() * colorsParameters.length)]

      const color = new THREE.Color(colorString)

      starColors[i3] = color.r
      starColors[i3 + 1] = color.g
      starColors[i3 + 2] = color.b
    }
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      sizeAttenuation: false,
      depthWrite: false,
      vertexColors: true,
    })
    this.starPoints = new THREE.Points(this.starGeometry, this.starMaterial)
    this.starGeometry.translate(0, 1, 0)

    this.scene.add(this.starPoints)
  }

  addGuiParams() {
    const parameters = this.parameters
    const generateGalaxy = this.generateGalaxy.bind(this)

    const folder = this.gui.addFolder('Galaxy')
    folder.add(parameters, 'count', 0, 100000).onChange(generateGalaxy)
    folder.add(parameters, 'starsCount', 0, 100000).onChange(generateGalaxy)
    folder.add(parameters, 'branches', 0, 30, 1).onChange(generateGalaxy)
    folder.add(parameters, 'radius', 10, 50).onChange(generateGalaxy)
    folder.add(parameters, 'spin', 0, 10, 0.005).onChange(generateGalaxy)
    folder.add(parameters, 'randomness', 0, 1, 0.01).onChange(generateGalaxy)
    folder
      .add(parameters, 'randomnessPower')
      .min(1)
      .max(10)
      .step(0.001)
      .onFinishChange(generateGalaxy)

    folder.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy)
    folder.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy)

    folder.addColor(parameters, 'starColorA').onFinishChange(generateGalaxy)
    folder.addColor(parameters, 'starColorB').onFinishChange(generateGalaxy)
    folder.addColor(parameters, 'starColorC').onFinishChange(generateGalaxy)
    folder.addColor(parameters, 'starColorD').onFinishChange(generateGalaxy)
  }

  override beforeRender() {
    this.geometry.rotateY(0.005)
    this.starGeometry.rotateY(0.004)
  }
}

new Galaxy()
