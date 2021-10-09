import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as gsap from 'gsap'
import { Experiment } from '../Experiment'
import { basicTexture, convertFloat32ArrayToVector3 } from '../../utils'

class DominosExperiment extends Experiment {
  world!: CANNON.World
  floor!: THREE.Mesh
  nbOfLinePoints = 0
  linePath!: THREE.Line
  curvePath!: THREE.CatmullRomCurve3
  curveObject!: THREE.Line
  pointsBuffer!: Float32Array
  objectsToUpdate: { body: CANNON.Body; mesh: THREE.Mesh }[] = []
  oldElapsedTime = 0
  runStarted = false
  cameraTarget = new THREE.Object3D()
  hasFinishedPlacedPoints = false

  constructor() {
    super({
      withSaoPass: false,
      withOrbitControls: true,
      withIcoBackground: true,
      cameraOptions: {
        far: 10000,
      },
    })

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)

    this.scene.fog = new THREE.Fog(0x565b5e, 0, 100)

    this.addPhysics()
    this.addFloor()
    this.addLights()
    this.addDominoLinePath()

    document.addEventListener('pointerdown', this.onMouseDown.bind(this), false)

    this.render()
  }

  addPhysics() {
    this.world = new CANNON.World()
    this.world.broadphase = new CANNON.NaiveBroadphase()
    this.world.solver.iterations = 30
    this.world.solver.tolerance = 0.01
    this.world.allowSleep = true
    this.world.gravity.set(0, -9.82, 0)
    this.world.defaultContactMaterial.friction = 0.005
  }

  addFloor() {
    const planeGeometry = new THREE.PlaneGeometry(400, 400, 1, 1)
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: '#777777',
      metalness: 0.3,
      roughness: 0.4,
    })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.receiveShadow = true
    plane.rotation.x = -Math.PI / 2
    plane.position.y = 0
    this.scene.add(plane)
    this.floor = plane

    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body()
    floorBody.mass = 0
    floorBody.addShape(floorShape)
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    this.world.addBody(floorBody)
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0x3d4143))

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(300, 1000, 500)
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    const d = 300
    light.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 500, 16000)
    light.shadow.bias = 0.01
    light.shadow.mapSize.width = light.shadow.mapSize.height = 1024
    this.scene.add(light)
  }

  addDominoLinePath() {
    const MAX_POINTS = 500

    this.pointsBuffer = new Float32Array(MAX_POINTS * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pointsBuffer, 3))
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 0,
    })
    this.linePath = new THREE.Line(geometry, material)
    this.linePath.position.y = -0.2
    this.scene.add(this.linePath)

    this.curvePath = new THREE.CatmullRomCurve3()
    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 3,
      gapSize: 1,
    })

    mat.opacity = 0.5
    this.curveObject = new THREE.Line(geometry, mat)
    this.curveObject.position.y = 0.2
    this.scene.add(this.curveObject)
  }

  onMouseDown(evt: any) {
    if (this.hasFinishedPlacedPoints === false) {
      if (evt.button === 0) this.addLinePoint()
      if (evt.button === 2) {
        this.generateDominosAlongLinePath()
        this.hasFinishedPlacedPoints = true
        this.controls.enabled = true
      }
    }
  }

  addLinePoint() {
    const raycaster = new THREE.Raycaster()
    const activeCamera = this.camera
    raycaster.setFromCamera(this.mouse, activeCamera)
    const intersects = raycaster.intersectObject(this.floor)
    if (intersects.length > 0) {
      this.pointsBuffer[this.nbOfLinePoints * 3 + 0] = intersects[0].point.x
      this.pointsBuffer[this.nbOfLinePoints * 3 + 1] = intersects[0].point.y
      this.pointsBuffer[this.nbOfLinePoints * 3 + 2] = intersects[0].point.z
      this.nbOfLinePoints++
      this.linePath.geometry.setDrawRange(0, this.nbOfLinePoints)
      this.updateLine(intersects[0].point)
    }
  }

  updateLine(point: THREE.Vector3) {
    this.pointsBuffer[this.nbOfLinePoints * 3 - 3] = point.x
    this.pointsBuffer[this.nbOfLinePoints * 3 - 2] = point.y
    this.pointsBuffer[this.nbOfLinePoints * 3 - 1] = point.z

    this.curvePath.points = convertFloat32ArrayToVector3(
      this.linePath.geometry.attributes.position.array
    )
    this.curveObject.geometry.attributes.position.needsUpdate = true
  }

  async generateDominosAlongLinePath() {
    const points = this.curvePath.getSpacedPoints(this.curvePath.getLength() / 2)
    for (let i = 0; i < points.length; i++) {
      if (i !== 0) await new Promise((resolve) => setTimeout(resolve, 100))
      let dominoRotation = 0
      if (points[i + 1]) {
        dominoRotation = Math.atan2(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
      }

      const domino = this.createDomino(
        new THREE.Vector3(points[i].x, points[i].y + 2, points[i].z),
        new THREE.Euler(0, dominoRotation, 0)
      )

      const green = new THREE.Color(0x3fa652)
      const red = new THREE.Color(0xdd283c)

      const mixedColor = red.clone().lerp(green, i / points.length)
      domino.mesh.material.color = mixedColor
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
    const firstDomino = this.objectsToUpdate[0].body as CANNON.Body
    firstDomino.applyLocalForce(new CANNON.Vec3(0, 0, 40), new CANNON.Vec3(0, 2, 0))
    this.runStarted = true
  }

  createDomino(position: THREE.Vector3, rotation: THREE.Euler) {
    const width = 0.6 * 2
    const height = 1 * 2
    const depth = 0.25 * 2

    const boxGeometry = new THREE.BoxGeometry(width, height, depth)
    const boxMaterial = new THREE.MeshPhongMaterial({ map: basicTexture(1) })

    const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
    mesh.scale.set(width * 0.1, height * 0.1, depth * 0.1)

    const randomRotation = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )
    mesh.rotation.set(randomRotation.x, randomRotation.y, randomRotation.z)

    gsap.gsap.to(mesh.scale, { x: width, y: height, z: depth, ease: 'power1.inOut' })
    gsap.gsap.to(mesh.rotation, {
      duration: Math.random() * 0.5,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    })

    mesh.rotation.copy(rotation)
    mesh.position.copy(position)
    mesh.castShadow = true
    this.scene.add(mesh)

    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.8, depth * 0.5))
    const body = new CANNON.Body({ mass: 0.3, position: new CANNON.Vec3(0, 3, 0), shape: shape })
    body.position.copy(position as unknown as CANNON.Vec3)
    body.quaternion.copy(mesh.quaternion as unknown as CANNON.Quaternion)
    this.world.addBody(body)

    const item = { body, mesh }
    this.objectsToUpdate.push(item)

    return item
  }

  override beforeRender() {
    const elapsedTime = this.clock.getElapsedTime()
    const deltaTime = elapsedTime - this.oldElapsedTime
    this.oldElapsedTime = elapsedTime

    this.world.step(1 / 60, deltaTime, 3)

    for (const object of this.objectsToUpdate) {
      object.mesh.position.copy(object.body.position as unknown as THREE.Vector3)
      object.mesh.quaternion.copy(object.body.quaternion as unknown as THREE.Quaternion)
    }

    if (this.runStarted) {
      let highestVelocity = 0
      let highestVelocityObject = null
      for (const object of this.objectsToUpdate) {
        const velocity = object.body.velocity.length()
        if (velocity > highestVelocity && velocity > 0.5) {
          highestVelocity = velocity
          highestVelocityObject = object
        }
      }

      if (highestVelocityObject) {
        this.cameraTarget.position.lerp(highestVelocityObject.mesh.position, 0.1)
      }

      this.camera.lookAt(this.cameraTarget.position)

      return
    }

    const centroid = new THREE.Vector3()
    const num = this.objectsToUpdate.length
    for (let i = 0; i < num; i++) {
      centroid.add(this.objectsToUpdate[i].mesh.position)
    }

    centroid.divideScalar(num)
    if (!isNaN(centroid.y)) {
      this.cameraTarget.position.lerp(centroid, 0.1)
    }

    this.camera.lookAt(this.cameraTarget.position)
  }
}

new DominosExperiment()
