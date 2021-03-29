import * as THREE from "three";
const OrbitControls = require("three-orbit-controls")(THREE);

// Vertex Shader
const _VS = `
varying vec3 vWorldPosition;

void main() {

  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`;

// Fragment Shader
const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {

  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

class BasicWorldDemo {
  _threejs: THREE.WebGLRenderer;
  _camera: THREE.PerspectiveCamera;
  _scene: THREE.Scene;
  _previousRAF: number;
  _ballArray: Array<THREE.Mesh>;

  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    //this._threejs.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );

    // BASE CAMERA SETTINGS
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 20000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(75, 20, 0);

    // ORBIT CONTROLS
    const controls = new OrbitControls(this._camera, this._threejs.domElement);
    controls.target.set(0, 20, 0);
    controls.update();

    // SCENE
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color().setHSL(0.6, 0, 1);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    this._ballArray = new Array<THREE.Mesh>();

    this._LoadLight();
    this._LoadSky();
    this._LoadGround();
    this._LoadObjects();

    // TEXTURE BACKGROUND

    // const loader = new THREE.CubeTextureLoader();
    // const texture = loader.load([
    //   "../src/resources/posx.jpg",
    //   "../src/resources/negx.jpg",
    //   "../src/resources/posy.jpg",
    //   "../src/resources/negy.jpg",
    //   "../src/resources/posz.jpg",
    //   "../src/resources/negz.jpg",
    // ]);
    // this._scene.background = texture;

    // SCENE AND BACKGROUND

    // this._scene.background = new THREE.Color(0xff0000);

    this._RAF();
  }

  _LoadLight() {
    // DIR LIGHT
    let dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(-10, 500, 10);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1000.0;
    dirLight.shadow.camera.left = 100;
    dirLight.shadow.camera.right = -100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this._scene.add(dirLight);

    // // DIRECTIONAL LIGHT HELPER LINES
    // const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
    // this._scene.add(dirLightHelper);
  }

  _LoadSky() {
    // HEMI LIGHT
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemisphereLight.color.setHSL(0.6, 1, 0.6);
    hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
    hemisphereLight.position.set(0, 1000, 0);
    this._scene.add(hemisphereLight);

    // // HEMISPHERE LIGHT HELPER LINES
    // const hemisphereLightHelper = new THREE.HemisphereLightHelper(
    //   hemisphereLight,
    //   10
    // );
    // this._scene.add(hemisphereLightHelper);
    // this._sun = dirLight;

    // SKY
    const vertexShader = _VS;
    const fragmentShader = _FS;
    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: -10 },
      exponent: { value: 0.7 },
    };
    uniforms["topColor"].value.copy(hemisphereLight.color);

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereGeometry(5000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  _LoadGround() {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x55aa33 });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    ground.receiveShadow = true;
    this._scene.add(ground);
  }

  _LoadObjects() {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
      })
    );
    ball.position.set(0, 0, 0);
    ball.castShadow = true;
    ball.receiveShadow = true;

    // HEART SHAPE

    // const x = 0, y = 0;

    // const heartShape = new THREE.Shape();
    // heartShape.moveTo(x + 5, y + 5);
    // heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    // heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    // heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    // heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    // heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    // heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    // const geometry = new THREE.ShapeGeometry(heartShape).rotateZ(3.141593);
    // const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const heart = new THREE.Mesh(geometry, material);

    const objectGridSize = 4;

    for (let x = -objectGridSize; x < objectGridSize; x++) {
      for (let y = -objectGridSize; y < objectGridSize; y++) {
        let ballClone = ball.clone();
        ballClone.position.set(
          Math.random() + x * 10,
          Math.random() * 10.0 + 2.0,
          Math.random() + y * 10
        );
        this._scene.add(ballClone);
        this._ballArray.push(ballClone);
      }
    }
  }

  _Update() {}

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t: number) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }
      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(elapsedTime: number) {
    const elapsedTimeInSeconds = Math.min(1.0 / 30.0, elapsedTime * 0.001);

    this._Update();

    // UPDATE HERE
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new BasicWorldDemo();
});
