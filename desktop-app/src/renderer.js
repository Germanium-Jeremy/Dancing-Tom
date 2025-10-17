import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import './index.css';
import characterUrl from './assets/characters/Mouse.fbx?url';

// Import Mixamo animation URLs
import BreathingUrl from './assets/animations/Breathing Idle.fbx?url';
import DwarfIdleUrl from './assets/animations/Dwarf Idle.fbx?url';
import SadIdleUrl from './assets/animations/Sad Idle.fbx?url';
import WarriorIdleUrl from './assets/animations/Warrior Idle.fbx?url';
import HouseDancingUrl from './assets/animations/House Dancing.fbx?url';
import RobotDancingUrl from './assets/animations/Robot Hip Hop Dance.fbx?url';
import ShoppingCartDanceUrl from './assets/animations/Shopping Cart Dance.fbx?url';
import ThrillerDanceUrl from './assets/animations/Thriller Part 2.fbx?url';

// Import skybox textures
import skyboxFt from '../public/images/wall.jpg';
import skyboxBk from '../public/images/wall.jpg';
import skyboxUp from '../public/images/sky3.jpg';
import skyboxDn from '../public/images/sky4.jpg';
import skyboxRt from '../public/images/wall.jpg';
import skyboxLf from '../public/images/wall.jpg';

// Import ground texture
import groundTextureUrl from '../public/images/floor.jpg'; // Update this path to your ground texture image

const idleAnimations = [
  { id: 'idle-breath', name: "Breathing", icon: '../public/images/image1.png', url: BreathingUrl },
  { id: 'idle-dwarf', name: "Dwarf", icon: '../public/images/image2.png', url: DwarfIdleUrl },
  { id: 'idle-sad', name: "Sad", icon: '../public/images/image3.png', url: SadIdleUrl },
  { id: 'idle-warrior', name: "Warrior", icon: '../public/images/image1.png', url: WarriorIdleUrl }
];

const dancingAnimations = [
  { id: 'dancing-house', name: "House", icon: '../public/images/HouseDance.jpg', url: HouseDancingUrl },
  { id: 'dancing-robot', name: "Robot", icon: '../public/images/robotDance.png', url: RobotDancingUrl },
  { id: 'dancing-shopping', name: "Shopping", icon: '../public/images/Shoping.png', url: ShoppingCartDanceUrl },
  { id: 'dancing-thriller', name: "Thriller", icon: '../public/images/ThrillerDance1.png', url: ThrillerDanceUrl }
];

function initThreeScene() {
  const container = document.getElementById('scene-root');
  if (!container) {
    console.warn('scene-root not found, skipping Three.js initialization');
    return;
  }

  // Create and show loading screen
  let loadingScreen = document.createElement('div');
  loadingScreen.id = 'loading-screen';
  loadingScreen.innerHTML = `
    <div class="loading-content">
      <h2>Loading 3D Scene...</h2>
      <div class="progress-bar">
        <div id="progress" style="width: 0%;"></div>
      </div>
      <p id="loading-text">0%</p>
    </div>
  `;
  document.body.appendChild(loadingScreen);

  // Determine initial size from the container
  const { width, height } = container.getBoundingClientRect();

  // Scene
  const scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xf8fafc); // slate-50 like background

  // Camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 600);
  camera.position.set(7, 6, 10);
  camera.lookAt(0, 1, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Camera controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.enablePan = false;         // prevent free panning away from target
  controls.minDistance = 5.0;         // how close the camera can get
  controls.maxDistance = 20.0;        // how far it can zoom out

  // Limit vertical rotation so you don’t go under the ground
  controls.minPolarAngle = 0.4;       // radians (~11 deg above “top”)
  controls.maxPolarAngle = Math.PI / 2;  // up to horizon (90°)

  // Initial target roughly at character’s chest height (updated after model loads)
  controls.target.set(0, 1, 5);

  // Skybox
  const materialArray = [];
  const textures = [
    skyboxFt, // front
    skyboxBk, // back
    skyboxUp, // up
    skyboxDn, // down
    skyboxRt, // right
    skyboxLf  // left
  ];

  textures.forEach((texture) => {
    const material = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(texture),
      side: THREE.BackSide
    });
    materialArray.push(material);
  });

  const skyBoxGeometry = new THREE.BoxGeometry(500, 500, 500);
  const skyBox = new THREE.Mesh(skyBoxGeometry, materialArray);
  scene.add(skyBox);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 0.9);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 10, 7);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  const range = 20;
  dir.shadow.camera.near = range / 10;
  dir.shadow.camera.far = range;
  dir.shadow.camera.left = -range;
  dir.shadow.camera.right = range;
  dir.shadow.camera.top = range;
  dir.shadow.camera.bottom = -range;
  dir.shadow.bias = -0.0005;
  dir.shadow.normalBias = 0.02;
  scene.add(dir);

  // Ground with texture
  const groundTexture = new THREE.TextureLoader().load(groundTextureUrl);
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(10, 10); // Adjust the repeat value to tile the texture
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new FBXLoader();
  let mixer;
  let model;
  let currentAction = null;
  let idleTimer = null;

  loader.load(
    characterUrl,
    (object) => {
      model = object;
      model.position.set(0, 0, 0);
      model.scale.set(0.04, 0.04, 0.04);
      scene.add(model);

      // Lock camera to the model
      const tmpTarget = new THREE.Vector3();
      function lockControlsToModel() {
        // Follow model’s world position; add a bit of height so target is at upper torso/head
        model.getWorldPosition(tmpTarget);
        tmpTarget.y += 1.0;
        controls.target.copy(tmpTarget);
      }

      // Set initial target once
      lockControlsToModel();

      // Ensure all meshes in the character cast (and optionally receive) shadows
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          // Optional: if you want the character to receive shadows from itself/others
          // o.receiveShadow = true;
          // Ensure shadow-friendly materials
          if (o.material) {
            o.material.shadowSide = THREE.FrontSide; // helps avoid darkening both sides
          }
        }
      });

      mixer = new THREE.AnimationMixer(model);
      startIdleRoutine();

      // Hide loading screen after model is loaded
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.remove();
        }, 500); // Fade out with a 0.5s transition
      }
    },
    (ev) => {
      // Update loading progress
      const progress = (ev.loaded / ev.total) * 100;
      const progressBar = document.getElementById('progress');
      const loadingText = document.getElementById('loading-text');
      if (progressBar && loadingText) {
        progressBar.style.width = `${progress}%`;
        loadingText.textContent = `${Math.round(progress)}%`;
      }
    },
    (err) => {
      console.error('Failed to load FBX character model:', err);
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.innerHTML = '<h2>Error loading 3D model</h2>';
      }
    }
  );

  function loadFbxClip(url) {
    return new Promise((resolve, reject) => {
      loader.load(url, (obj) => {
        const clip = (obj.animations && obj.animations[0]) || null;
        if (!clip) {
          console.warn("No animations found in ", url);
          resolve(null);
        } else {
          resolve(clip);
        }
      }, undefined, (err) => reject(err));
    });
  }

  function fadeToAction(clip, { loop = THREE.LoopRepeat, clamp = false, fade = 0.5 } = {}) {
    if (!clip || !mixer || !model) return null;

    // Stop the current action if it exists
    if (currentAction) {
      currentAction.fadeOut(fade);
      currentAction = null; // Clear current action to prevent overlap
    }

    const next = mixer.clipAction(clip, model);
    next.setLoop(loop);
    next.clampWhenFinished = clamp;
    next.reset().fadeIn(fade).play();

    currentAction = next;
    return next;
  }

  async function startIdleRoutine() {
    stopIdleRoutine();

    const pick = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
    const clip = await loadFbxClip(pick.url);
    if (!clip) {
      idleTimer = setTimeout(startIdleRoutine, 1500);
      return;
    }

    fadeToAction(clip, { loop: THREE.LoopRepeat, clamp: false, fade: 0.8 });

    // Schedule the next idle switch after the clip duration plus a small random delay
    const nextDelayMs = clip.duration * 1000 + (Math.random() * 500 + 300); // 200-600ms extra delay
    idleTimer = setTimeout(startIdleRoutine, nextDelayMs);
  }

  function stopIdleRoutine() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  async function playDanceById(id) {
    if (!mixer || !model) return;

    stopIdleRoutine();
    const meta = dancingAnimations.find((d) => d.id === id);
    if (!meta) {
      console.warn('Dance id not found:', id);
      startIdleRoutine();
      return;
    }

    const clip = await loadFbxClip(meta.url);
    if (!clip) {
      console.warn('No clip found for dance url:', meta.url);
      startIdleRoutine();
      return;
    }

    const action = fadeToAction(clip, {
      loop: THREE.LoopOnce,
      clamp: true,
      fade: 0.6,
    });

    const onFinished = (e) => {
      if (e.action === action) {
        mixer.removeEventListener('finished', onFinished);
        // Delay restarting idle routine to ensure fade-out completes
        setTimeout(startIdleRoutine, 500);
      }
    };
    mixer.addEventListener('finished', onFinished);
  }

  // Animation loop
  const clock = new THREE.Clock();
  function animate() {
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // Resize handling
  const resizeObserver = new ResizeObserver(() => {
    const { width: w, height: h } = container.getBoundingClientRect();
    if (w > 0 && h > 0) {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  });
  resizeObserver.observe(container);

  function bindDanceMenuClicks() {
    document.querySelectorAll('[data-dance-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-dance-id');
        playDanceById(id);
      });
    });
  }

  function populateDanceMenu() {
    const menu = document.getElementById('dance-menu');
    if (!menu) return;

    dancingAnimations.forEach((anim) => {
      const button = document.createElement('button');
      button.className = 'flex items-center p-2 bg-white hover:bg-gray-200 min-w-[5rem] rounded shadow';
      button.setAttribute('data-dance-id', anim.id);
      button.innerHTML = `
        <img src="${anim.icon}" alt="${anim.name}" class="w-8 h-8 mr-2">
        <span>${anim.name}</span>
      `;
      menu.appendChild(button);
    });
  }

  // Initialize scene and menu
  populateDanceMenu();
  bindDanceMenuClicks();
}

window.addEventListener('DOMContentLoaded', () => {
  initThreeScene();
  console.log('Three.js scene initialized in #scene-root');
});