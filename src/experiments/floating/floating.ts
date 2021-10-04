import gsap from 'gsap';
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import dat from 'dat.gui'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPAss.js';

// create a basic threejs scene
var scene = new THREE.Scene();
// create a basic threejs camera
var camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
// create a basic threejs renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 7;

interface SceneObject {
    initialPosition: THREE.Vector3
    mesh: THREE.Mesh,
    random: number
}

const sceneObjects: SceneObject[] = [];


const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 12, 12);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32);
const torusGeometry = new THREE.TorusGeometry(1, 0.3, 32, 100);
const torusKnotGeometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
const octahedronGeometry = new THREE.OctahedronGeometry(1, 0);
const icosahedronGeometry = new THREE.IcosahedronGeometry(1, 0);
const material = new THREE.MeshLambertMaterial({
    // wireframe: true
})


for (let i = 0; i < 2000; i++) {
    const availableGeometries = [
        boxGeometry,
        sphereGeometry,
        cylinderGeometry,
        torusGeometry,
        // torusKnotGeometry,
        octahedronGeometry,
        icosahedronGeometry
    ]

    // get random geometry and add it to the scene
    const geometry = availableGeometries[Math.floor(Math.random() * availableGeometries.length)]
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.x = Math.random() * 20 - 10
    mesh.position.y = Math.random() * 20 - 10
    mesh.position.z = Math.random() * 20 - 10

    mesh.rotation.x = Math.random() * Math.PI * 2
    mesh.rotation.y = Math.random() * Math.PI * 2

    const scale = Math.random() * 0.4
    mesh.scale.set(scale, scale, scale)


    sceneObjects.push({
        initialPosition: mesh.position.clone(),
        mesh,
        random: Math.random() * 10
    })
    scene.add(mesh)


}

// add orbital controls
var controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock()
const mouse = new THREE.Vector2()
document.addEventListener('mousemove', onDocumentMouseMove, false);
function onDocumentMouseMove(event: MouseEvent) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}


// add spere light
var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
scene.add(sphere);



const lightIntensity = 1

var lightRed = new THREE.PointLight(0xe30056, lightIntensity, 100);
lightRed.position.set(5, 5, 5);
scene.add(lightRed);



var light = new THREE.PointLight(0x00aff2, lightIntensity, 100);
light.position.set(0, 0, 5);
scene.add(light);


const renderScene = new RenderPass( scene, camera );


const params = {
    exposure: 1.1,
    bloomStrength: 1.7,
    bloomThreshold: 0.4,
    bloomRadius: 0.84
};

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

let composer = new EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );

// render the scene
function render() {
    requestAnimationFrame(render);
    let t = clock.getElapsedTime()

    sceneObjects.forEach(object => {
        object.mesh.position.y +=  Math.sin(object.random + t) * 0.005
    })


    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject( camera );
    var dir = vector.sub( camera.position ).normalize();
    var distance = - camera.position.z / dir.z;
    var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );


    // change light to cursor position
    light.position.lerp(pos, 0.1)
    sphere.position.lerp(pos, 0.1)


    // renderer.render(scene, camera);
    composer.render()
}
render();



// resize canvas to windows size
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})


// //  add dat.gui controls
var gui = new dat.GUI();

class ColorGUIHelper {
    object: any
    prop: string

    constructor(object: any, prop: string) {
      this.object = object;
      this.prop = prop;
    }
    get value() {
      return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
      this.object[this.prop].set(hexString);
    }
  }




// console.log(material)
gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color');
gui.add(light, 'intensity', 0, 5, 0.001)

gui.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {

    renderer.toneMappingExposure = Math.pow( value, 4.0 );

} );

gui.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {

    bloomPass.threshold = Number( value );

} );

gui.add( params, 'bloomStrength', 0.0, 3.0 ).onChange( function ( value ) {

    bloomPass.strength = Number( value );

} );

gui.add( params, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {

    bloomPass.radius = Number( value );

} );