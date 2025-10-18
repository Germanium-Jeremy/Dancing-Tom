import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, TouchableOpacity, Image, Alert, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader } from "three-stdlib";
import { Asset } from "expo-asset";

// Animation data with proper typing
interface AnimationData {
  id: string;
  name: string;
  icon: any;
  url: any;
}

const idleAnimations: AnimationData[] = [
  { 
    id: "idle-breath", 
    name: "Breathing", 
    icon: require("../assets/images/HouseDance.jpg"), 
    url: require("../assets/animations/Breathing Idle.fbx") 
  },
  { 
    id: "idle-dwarf", 
    name: "Dwarf", 
    icon: require("../assets/images/robotDance.png"), 
    url: require("../assets/animations/Dwarf Idle.fbx") 
  },
  { 
    id: "idle-sad", 
    name: "Sad", 
    icon: require("../assets/images/Shoping.png"), 
    url: require("../assets/animations/Sad Idle.fbx") 
  },
  { 
    id: "idle-warrior", 
    name: "Warrior", 
    icon: require("../assets/images/ThrillerDance1.png"), 
    url: require("../assets/animations/Warrior Idle.fbx") 
  },
];

const dancingAnimations: AnimationData[] = [
  { 
    id: "dancing-house", 
    name: "House", 
    icon: require("../assets/images/HouseDance.jpg"), 
    url: require("../assets/animations/House Dancing.fbx") 
  },
  { 
    id: "dancing-robot", 
    name: "Robot", 
    icon: require("../assets/images/robotDance.png"), 
    url: require("../assets/animations/Robot Hip Hop Dance.fbx") 
  },
  { 
    id: "dancing-shopping", 
    name: "Shopping", 
    icon: require("../assets/images/Shoping.png"), 
    url: require("../assets/animations/Shopping Cart Dance.fbx") 
  },
  { 
    id: "dancing-thriller", 
    name: "Thriller", 
    icon: require("../assets/images/ThrillerDance1.png"), 
    url: require("../assets/animations/Thriller Part 2.fbx") 
  },
];

interface SceneProps {
  onDanceSelect: React.MutableRefObject<(id: string) => void>;
}

function Scene({ onDanceSelect }: SceneProps) {
  const { scene } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null | number>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load character model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const characterAsset = Asset.fromModule(require("../assets/characters/Mouse.fbx"));
        await characterAsset.downloadAsync();
        
        const loader = new FBXLoader();
        loader.load(
          characterAsset.localUri || characterAsset.uri,
          (object: THREE.Group) => {
            object.position.set(0, 0, 0);
            object.scale.set(0.04, 0.04, 0.04);
            
            // Configure shadows
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                if (child.material) {
                  (child.material as THREE.MeshStandardMaterial).shadowSide = THREE.FrontSide;
                }
              }
            });
            
            setModel(object);
            setIsLoading(false);
          },
          undefined,
          (error) => {
            console.error("Failed to load character:", error);
            Alert.alert("Error", "Failed to load character model");
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error("Asset loading error:", error);
        Alert.alert("Error", "Failed to prepare character asset");
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  // Add model to scene
  useEffect(() => {
    if (model) {
      scene.add(model);
      return () => {
        scene.remove(model);
      };
    }
  }, [model, scene]);

  // Animation system
  useEffect(() => {
    if (!model) return;

    mixerRef.current = new THREE.AnimationMixer(model);

    const loadAnimationClip = async (animationModule: any): Promise<THREE.AnimationClip | null> => {
      try {
        const asset = Asset.fromModule(animationModule);
        await asset.downloadAsync();
        
        const loader = new FBXLoader();
        const animationFBX = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            asset.localUri || asset.uri,
            resolve,
            undefined,
            reject
          );
        });
        
        return animationFBX.animations?.[0] || null;
      } catch (error) {
        console.error("Animation loading error:", error);
        return null;
      }
    };

    const fadeToAction = (
      clip: THREE.AnimationClip,
      options: { loop?: THREE.AnimationActionLoopStyles; clamp?: boolean; fade?: number } = {}
    ) => {
      const { loop = THREE.LoopRepeat, clamp = false, fade = 0.5 } = options;
      
      if (!clip || !mixerRef.current) return null;

      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(fade);
      }

      const action = mixerRef.current.clipAction(clip, model);
      action.setLoop(loop, Infinity);
      action.clampWhenFinished = clamp;
      action.reset().fadeIn(fade).play();

      currentActionRef.current = action;
      return action;
    };

    const stopIdleRoutine = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const startIdleRoutine = async () => {
      stopIdleRoutine();

      const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
      const clip = await loadAnimationClip(randomIdle.url);
      
      if (!clip) {
        idleTimerRef.current = setTimeout(startIdleRoutine, 1500);
        return;
      }

      fadeToAction(clip, { loop: THREE.LoopRepeat, clamp: false, fade: 0.8 });

      const nextDelayMs = clip.duration * 1000 + (Math.random() * 500 + 300);
      idleTimerRef.current = setTimeout(startIdleRoutine, nextDelayMs);
    };

    const playDanceById = async (id: string) => {
      if (!mixerRef.current) return;

      stopIdleRoutine();
      const danceData = dancingAnimations.find((d) => d.id === id);
      
      if (!danceData) {
        console.warn("Dance not found:", id);
        startIdleRoutine();
        return;
      }

      const clip = await loadAnimationClip(danceData.url);
      
      if (!clip) {
        console.warn("Failed to load dance animation:", danceData.name);
        startIdleRoutine();
        return;
      }

      const action = fadeToAction(clip, {
        loop: THREE.LoopOnce,
        clamp: true,
        fade: 0.6,
      });

      if (action && mixerRef.current) {
        const onFinished = (event: any) => {
          if (event.action === action) {
            mixerRef.current?.removeEventListener("finished", onFinished);
            setTimeout(startIdleRoutine, 500);
          }
        };
        mixerRef.current.addEventListener("finished", onFinished);
      }
    };

    // Start idle routine
    startIdleRoutine();
    
    // Expose dance function to parent
    onDanceSelect.current = playDanceById;

    return () => {
      stopIdleRoutine();
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [model, onDanceSelect]);

  // Animation loop
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return (
    <>
      {/* Lights */}
      <hemisphereLight args={[0xffffff, 0x777777, 0.9]} position={[0, 20, 0]} />
      <directionalLight
        position={[5, 10, 7]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-near={2}
        shadow-camera-far={20}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={0xdddddd} />
      </mesh>

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={5.0}
        maxDistance={20.0}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2}
        target={[0, 1, 0]}
      />
    </>
  );
}

export default function HomeScreen() {
  const onDanceSelect = useRef<(id: string) => void>(() => {});

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scene}>
        <Canvas
          camera={{ position: [7, 6, 10], fov: 45, near: 0.1, far: 600 }}
          shadows
          gl={{ antialias: true }}
        >
          <Scene onDanceSelect={onDanceSelect} />
        </Canvas>
      </View>
      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Choose A Dance</Text>
        <View style={styles.menuGrid}>
          {dancingAnimations.map((anim) => (
            <TouchableOpacity
              key={anim.id}
              style={styles.menuButton}
              onPress={() => onDanceSelect.current(anim.id)}
            >
              <Image source={anim.icon} style={styles.menuIcon} />
              <Text style={styles.menuText}>{anim.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flex: 1,
    flexDirection: "row",
  },
  scene: {
    width: "75%",
    flex: 1,
  },
  menu: {
    width: "25%",
    maxWidth: 150,
    flex: 1,
    backgroundColor: "#fee685",
    padding: 20,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 80,
  },
  menuIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  menuText: {
    fontSize: 14,
  },
});
