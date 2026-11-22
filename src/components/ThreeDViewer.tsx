'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BoundingBox, Language } from '../types';
import { translations } from '../i18n/translations';
import { catalogText } from '../i18n/catalog';
import { RotateCcw, Box, Eye, EyeOff, Layers, Maximize2 } from 'lucide-react';

interface ThreeDViewerProps {
  geometry: THREE.BufferGeometry | null;
  materialColor?: string;
  materialType?: string;
  bounds?: BoundingBox;
  language: Language;
  heightClass?: string;
  autoRotate?: boolean;
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({
  geometry,
  materialColor = '#c86432',
  materialType = 'PLA',
  bounds,
  language,
  heightClass = 'h-[440px]',
  autoRotate = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.LineSegments | null>(null);
  const bboxBoxRef = useRef<THREE.Box3Helper | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  const [isWireframe, setIsWireframe] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  const t = translations[language];
  const c = catalogText[language];

  // Helper to trigger frame render
  const triggerRender = useCallback(() => {
    if (requestRenderRef.current) {
      requestRenderRef.current();
    }
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 440;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Scene & Environment
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);
    camera.position.set(130, 110, 150);
    cameraRef.current = camera;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI / 2 + 0.08; // Allow slight under-view, but not inverted
    controlsRef.current = controls;

    // 5. Lighting Rig
    const ambientLight = new THREE.HemisphereLight(0xfff4e6, 0x1e293b, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(90, 140, 80);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    rimLight.position.set(-80, 60, -90);
    scene.add(rimLight);

    // 6. Build Plate Grid (representing 256x256mm Bambu / Voron bed)
    const gridHelper = new THREE.GridHelper(256, 32, 0xf59e0b, 0x475569);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(280, 280);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.02;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Bed border outline
    const bedBorderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(256, 0.2, 256));
    const bedBorderMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 });
    const bedBorder = new THREE.LineSegments(bedBorderGeo, bedBorderMat);
    scene.add(bedBorder);

    // Render loop mechanism
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        renderBusy = false;
        if (renderDirty || autoRotate) {
          requestRender();
        }
      });
    };
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);
    requestRender();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate]);

  // Update Geometry and Material
  useEffect(() => {
    if (!sceneRef.current || !geometry) return;
    const scene = sceneRef.current;

    // Clean up old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    }
    if (wireMeshRef.current) {
      scene.remove(wireMeshRef.current);
      wireMeshRef.current.geometry.dispose();
      wireMeshRef.current = null;
    }
    if (bboxBoxRef.current) {
      scene.remove(bboxBoxRef.current);
      bboxBoxRef.current = null;
    }

    // Material finish based on selected polymer
    const isSilk = materialType.includes('Silk') || materialType === 'PLA';
    const isResin = materialType === 'Resin';
    const isTPU = materialType === 'TPU';

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(materialColor),
      roughness: isResin ? 0.15 : isSilk ? 0.35 : isTPU ? 0.65 : 0.45,
      metalness: isResin ? 0.1 : isSilk ? 0.35 : 0.05,
      clearcoat: isResin ? 0.6 : isSilk ? 0.3 : 0.0,
      clearcoatRoughness: 0.2,
      wireframe: isWireframe,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Bounding Box Helper
    const box3 = new THREE.Box3().setFromObject(mesh);
    const boxHelper = new THREE.Box3Helper(box3, new THREE.Color(0xf59e0b));
    boxHelper.visible = showBoundingBox;
    scene.add(boxHelper);
    bboxBoxRef.current = boxHelper;

    // Adjust camera to frame model nicely
    if (cameraRef.current && controlsRef.current) {
      const size = new THREE.Vector3();
      box3.getSize(size);
      const center = new THREE.Vector3();
      box3.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z, 40);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.9;
      cameraDistance = Math.max(cameraDistance, 70);

      cameraRef.current.position.set(cameraDistance * 0.8, cameraDistance * 0.7, cameraDistance * 0.9);
      cameraRef.current.lookAt(center.x, size.y / 2, center.z);
      controlsRef.current.target.set(center.x, size.y / 2, center.z);
      controlsRef.current.update();
    }

    triggerRender();
  }, [geometry, materialColor, materialType, isWireframe, showBoundingBox, triggerRender]);

  // Update Wireframe
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.wireframe = isWireframe;
      meshRef.current.material.needsUpdate = true;
      triggerRender();
    }
  }, [isWireframe, triggerRender]);

  // Update Bounding Box visibility
  useEffect(() => {
    if (bboxBoxRef.current) {
      bboxBoxRef.current.visible = showBoundingBox;
      triggerRender();
    }
  }, [showBoundingBox, triggerRender]);

  // Update Grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
      triggerRender();
    }
  }, [showGrid, triggerRender]);

  // Reset Camera View
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current && bboxBoxRef.current) {
      const box = bboxBoxRef.current.box;
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z, 50);
      const dist = maxDim * 1.5;
      cameraRef.current.position.set(dist, dist * 0.8, dist * 1.1);
      controlsRef.current.target.set(center.x, size.y / 2, center.z);
      controlsRef.current.update();
      triggerRender();
    }
  };

  return (
    <div className={`relative w-full ${heightClass} bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-inner group select-none`}>
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left: Model Dimensions Callout */}
      {bounds && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 font-mono backdrop-blur-sm pointer-events-none">
          <span className="text-amber-400 font-semibold">{bounds.x}</span>
          <span className="text-neutral-500">×</span>
          <span className="text-amber-400 font-semibold">{bounds.y}</span>
          <span className="text-neutral-500">×</span>
          <span className="text-amber-400 font-semibold">{bounds.z}</span>
          <span className="text-neutral-500 ml-1">{c.mm}</span>
        </div>
      )}

      {/* Top Right: Build Plate Bed Info */}
      <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400 font-mono backdrop-blur-sm pointer-events-none">
        <span>{c.bed}</span>
      </div>

      {/* Bottom Center: Collapsible Ergonomic HUD Control Dock (Frontend Design & Three.js Skill Compliant) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 transition-transform duration-200 max-w-[94vw] ${
          isHudCollapsed ? 'translate-y-12' : 'translate-y-0'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Collapse/Expand Toggle Tab */}
          <button
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            className="mb-1 px-3 py-1 rounded-t-md bg-neutral-900/90 border-t border-x border-neutral-700 text-[11px] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            title={isHudCollapsed ? t.viewerShowHud : t.viewerHideHud}
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isHudCollapsed ? t.viewerShowHud : t.viewerHideHud}</span>
          </button>

          {/* Unified Horizontal Control Bar */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-neutral-950/90 border border-neutral-800 shadow-xl backdrop-blur-md">
            {/* Wireframe Toggle */}
            <button
              onClick={() => setIsWireframe(!isWireframe)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isWireframe ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
              title={t.viewerWireframe}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isWireframe ? t.viewerSolid : t.viewerWireframe}</span>
            </button>

            {/* Bounding Box Toggle */}
            <button
              onClick={() => setShowBoundingBox(!showBoundingBox)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showBoundingBox ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={t.viewerBoundingBox}
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.viewerBoundingBox}</span>
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showGrid ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={c.toggleGrid}
            >
              {showGrid ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{c.grid}</span>
            </button>

            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              title={t.viewerResetCam}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.viewerResetCam}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
