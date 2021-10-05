import * as gsap from 'gsap'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SceneUtils } from 'three/examples/jsm/utils/SceneUtils.js'
import * as dat from 'dat.gui'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader.js';

/*
    Globals
*/
function gradTexture(color) {
    var c = document.createElement("canvas");
    var ct = c.getContext("2d");
    c.width = 16; c.height = 256;
    var gradient = ct.createLinearGradient(0, 0, 0, 256);
    var i = color[0].length;
    while (i--) { gradient.addColorStop(color[0][i], color[1][i]); }
    ct.fillStyle = gradient;
    ct.fillRect(0, 0, 16, 256);
    var texture = new THREE.Texture(c);
    texture.needsUpdate = true;
    return texture;
}

const parameters = {
    shuffleAnimationDuration: 0.2,
    blendRatio: 0.8
}

let movesDones = []

// basic threejs setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
    // add fog
    scene.fog = new THREE.Fog(0x565B5E, 0, 100);

let controls = new OrbitControls(camera, renderer.domElement);

/**
 * Lights
 */
scene.add(new THREE.AmbientLight(0x3D4143));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(300, 1000, 500);
light.target.position.set(0, 0, 0);
light.castShadow = true;
var d = 300;
light.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 500, 16000);
light.shadow.bias = 0.01;
light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
scene.add(light);


// var buffgeoBack = new THREE.BufferGeometry();
const gem = new THREE.IcosahedronGeometry(30, 2);
var back = new THREE.Mesh(gem, new THREE.MeshBasicMaterial({ map: gradTexture([[0.75, 0.6, 0.4], ['#4158D0', '#C850C0', '#FFCC70',]]), side: THREE.BackSide, depthWrite: false, fog: false }));
//back.geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(15*ToRad));
scene.add(back);

// create camera
camera.position.set(7, 7, 7)
camera.lookAt(0, 0, 0)

// Post-processing inits
const composer = new EffectComposer(renderer);

// render pass
const renderPass = new RenderPass(scene, camera);

const renderTargetParameters = {
	minFilter: THREE.LinearFilter,
	magFilter: THREE.LinearFilter,
	stencilBuffer: false
};

// save pass
const savePass = new SavePass(
	new THREE.WebGLRenderTarget(
		document.body.clientWidth,
		document.body.clientHeight,
		renderTargetParameters
	)
);

// blend pass
const blendPass = new ShaderPass(BlendShader, "tDiffuse1");
blendPass.uniforms["tDiffuse2"].value = savePass.renderTarget.texture;
blendPass.uniforms["mixRatio"].value = parameters.blendRatio;

// output pass
const outputPass = new ShaderPass(CopyShader);
outputPass.renderToScreen = true;

// adding passes to composer
composer.addPass(renderPass);
composer.addPass(blendPass);
composer.addPass(savePass);
composer.addPass(outputPass);


let allCubes: THREE.Mesh[] = []
const generateRubiks = async () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)

    allCubes = []
    const rubiksSize = 4
    const spacing = 1.1

    // 14f7ff
    // red, green, blue
    var colours = [0xC41E3A, 0x88ea00, 0x14f7ff, 0xFF5800, 0xFFD500, 0xFFFFFF],
        faceMaterials = colours.map(function (c) {
            return new THREE.MeshBasicMaterial({ color: c });
        })

    for (let i = 0; i < rubiksSize; i++) {
        for (let j = 0; j < rubiksSize; j++) {
            for (let k = 0; k < rubiksSize; k++) {
                const cube = new THREE.Mesh(geometry, faceMaterials)
                cube.castShadow = true
                cube.receiveShadow = true

                var positionOffset = (rubiksSize - 1) / 2;

                var x = (i - positionOffset) * spacing,
                    y = (j - positionOffset) * spacing,
                    z = (k - positionOffset) * spacing;
                // cube.position.set(startX, startY, startZ)

                cube.scale.set(0.1, 0.1, 0.1)

                await new Promise(resolve => setTimeout(resolve, 5))

                gsap.gsap.to(cube.position, {
                    y: y,
                    x: x,
                    z: z,
                    duration: 1,
                    ease: gsap.Power3.easeInOut,
                }).then(() => {
                    gsap.gsap.to(cube.scale, {
                        x: 1,
                        y: 1,
                        z: 1,
                        ease: gsap.Power4.easeOut
                    })
                })

                scene.add(cube)
                allCubes.push(cube)
            }
        }
    }

    // const cube = new THREE.Mesh(geometry, material)
    // scene.add(cube)
}

generateRubiks()

function nearlyEqual(a: number, b: number, d = 0.001) {
    return Math.abs(a - b) <= d;
}

const getCubeGroup = (selectedCube: THREE.Mesh, axis: 'x' | 'y' | 'z'): THREE.Mesh[] => {
    return allCubes.filter(c => nearlyEqual(selectedCube.position[axis], c.position[axis]))
}

const getRandomCube = () => {
    return allCubes[Math.floor(Math.random() * allCubes.length)]
}

const pivot = new THREE.Group()
scene.add(pivot)
let activeGroup: THREE.Mesh[] = []



function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

const rotate = (cube: THREE.Mesh, axis: 'x' | 'y' | 'z', direction: number, addToMoves = true) => {

    function randomAxis() {
        return ['x', 'y', 'z'][randomInt(0,2)];
      }

      
      function randomDirection() {
        var x = randomInt(0,1);
        if(x == 0) x = -1;
        return x;
      }

    const group = getCubeGroup(cube, axis)
    activeGroup = group
    pivot.rotation.set(0, 0, 0)
    pivot.updateMatrixWorld()
    // scene.add(pivot)

    group.forEach(c => {
        pivot.attach(c)
    })

    if (addToMoves) {

        movesDones.push({
            cube,
            axis,
            direction
        })
    }

    return gsap.gsap.to(pivot.rotation, {
        [axis]: Math.PI / 2 * direction,
        duration: parameters.shuffleAnimationDuration,
        ease: gsap.Power3.easeOut,
    }).then(() => {
        pivot.updateMatrixWorld();
        group.forEach(function(cube) {
            scene.attach(cube)
        })
    })
}

const gui = new dat.GUI()
var obj = {
    Resolve: async function() {
        const moves = [...movesDones].reverse()
        for (const move of moves) {
            await rotate(move.cube, move.axis, -move.direction, false)
        }

        movesDones = []
    },

    Shuffle: async function () {
        function randomAxis() {
            return ['x', 'y', 'z'][randomInt(0,2)];
          }
    
          function randomDirection() {
            var x = randomInt(-2,2);
            if(x == 0) x = -1;
            return x;
          }


  

          for (let i = 0; i < randomInt(20, 30); i++) {
            await rotate(getRandomCube(), randomAxis(), randomDirection())
          }
    }
};

gui.add(obj, 'Shuffle');
gui.add(obj, 'Resolve');

gui.add(parameters, 'shuffleAnimationDuration').min(0).max(3).step(0.1)
gui.add(parameters, 'blendRatio').min(0).max(0.99).step(0.01).onChange(() => {
    blendPass.uniforms["mixRatio"].value = parameters.blendRatio
})



// render loop
const render = () => {
    requestAnimationFrame(render)
    controls.update()
    // renderer.render(scene, camera)
    composer.render()

    // allCubes.forEach(cube => {
    //     cube.position.y += Math.sin(Date.now() / 1000) * 0.01
    // })
}
render()