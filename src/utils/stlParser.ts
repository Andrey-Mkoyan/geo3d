import * as THREE from 'three';
import { BoundingBox } from '../types';
export * from '../lib/pricing';


export interface ParsedSTLResult {
  geometry: THREE.BufferGeometry;
  triangles: number;
  bounds: BoundingBox;
  volumeCm3: number;
  warnings: string[];
}

/**
 * Calculates volume of a closed triangle mesh using signed tetrahedron volumes
 */
function calculateMeshVolume(positions: Float32Array): number {
  let totalVolume = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  for (let i = 0; i < positions.length; i += 9) {
    p1.set(positions[i], positions[i + 1], positions[i + 2]);
    p2.set(positions[i + 3], positions[i + 4], positions[i + 5]);
    p3.set(positions[i + 6], positions[i + 7], positions[i + 8]);

    // Signed volume of tetrahedron formed with origin
    totalVolume += p1.dot(p2.clone().cross(p3)) / 6.0;
  }

  // Convert mm³ to cm³ (1 cm³ = 1000 mm³)
  return Math.abs(totalVolume) / 1000.0;
}

/**
 * Parse Binary STL ArrayBuffer
 */
export function parseBinarySTL(buffer: ArrayBuffer): ParsedSTLResult {
  const dataView = new DataView(buffer);
  const triangles = dataView.getUint32(80, true);

  const positions = new Float32Array(triangles * 9);
  const normals = new Float32Array(triangles * 9);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let offset = 84;
  let posIdx = 0;

  for (let i = 0; i < triangles; i++) {
    // Normal vector
    const nx = dataView.getFloat32(offset, true);
    const ny = dataView.getFloat32(offset + 4, true);
    const nz = dataView.getFloat32(offset + 8, true);
    offset += 12;

    // 3 Vertices
    for (let v = 0; v < 3; v++) {
      const x = dataView.getFloat32(offset, true);
      const y = dataView.getFloat32(offset + 4, true);
      const z = dataView.getFloat32(offset + 8, true);
      offset += 12;

      positions[posIdx] = x;
      positions[posIdx + 1] = y;
      positions[posIdx + 2] = z;

      normals[posIdx] = nx;
      normals[posIdx + 1] = ny;
      normals[posIdx + 2] = nz;
      posIdx += 3;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    // Skip 2-byte attribute byte count
    offset += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.computeVertexNormals();

  // Center geometry at origin, grounded on Z=0
  geometry.center();
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const height = bb.max.y - bb.min.y;
  geometry.translate(0, height / 2, 0);

  const bounds: BoundingBox = {
    x: Math.round(maxX - minX),
    y: Math.round(maxY - minY),
    z: Math.round(maxZ - minZ),
  };

  const volumeCm3 = Math.max(1, Math.round(calculateMeshVolume(positions) * 10) / 10);
  const warnings: string[] = [];

  if (bounds.x > 256 || bounds.y > 256 || bounds.z > 256) {
    warnings.push('Dimensions exceed standard 256x256x256mm build volume.');
  }

  return { geometry, triangles, bounds, volumeCm3, warnings };
}

/**
 * Parse ASCII STL text string
 */
export function parseAsciiSTL(text: string): ParsedSTLResult {
  const lines = text.split('\n');
  const posArray: number[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          posArray.push(x, y, z);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        }
      }
    }
  }

  const positions = new Float32Array(posArray);
  const triangles = Math.floor(positions.length / 9);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.center();

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const height = bb.max.y - bb.min.y;
  geometry.translate(0, height / 2, 0);

  const bounds: BoundingBox = {
    x: Math.round((maxX === -Infinity ? 50 : maxX) - (minX === Infinity ? 0 : minX)),
    y: Math.round((maxY === -Infinity ? 50 : maxY) - (minY === Infinity ? 0 : minY)),
    z: Math.round((maxZ === -Infinity ? 50 : maxZ) - (minZ === Infinity ? 0 : minZ)),
  };

  const volumeCm3 = Math.max(1, Math.round(calculateMeshVolume(positions) * 10) / 10);
  const warnings: string[] = [];
  if (bounds.x > 256 || bounds.y > 256 || bounds.z > 256) {
    warnings.push('Dimensions exceed standard 256x256x256mm build volume.');
  }

  return { geometry, triangles, bounds, volumeCm3, warnings };
}

/**
 * Universal auto-detect STL parser (Binary vs ASCII)
 */
export function parseSTLFile(buffer: ArrayBuffer): ParsedSTLResult {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 512));
  let isAscii = false;

  // Check for ASCII signature
  const headerText = String.fromCharCode.apply(null, Array.from(bytes));
  if (headerText.startsWith('solid') && !headerText.includes('\0')) {
    // Might be ASCII, verify if file contains facet/vertex
    const textSample = new TextDecoder('utf-8').decode(buffer.slice(0, 2048));
    if (textSample.includes('facet') && textSample.includes('vertex')) {
      isAscii = true;
    }
  }

  if (isAscii) {
    const text = new TextDecoder('utf-8').decode(buffer);
    return parseAsciiSTL(text);
  } else {
    return parseBinarySTL(buffer);
  }
}


/**
 * Procedural sample 3D geometries for instant testing without uploading files
 */
export function createSampleGeometry(type: 'vase' | 'stand' | 'bracket' | 'gear' | 'dragon' | 'tag'): {
  geometry: THREE.BufferGeometry;
  triangles: number;
  bounds: BoundingBox;
  volumeCm3: number;
} {
  let geo: THREE.BufferGeometry;
  let bounds: BoundingBox = { x: 50, y: 50, z: 50 };
  let volume = 50;

  if (type === 'vase') {
    // Parametric twisted vase using Lathe / Cylinder with mathematical twist
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const radius = 22 + Math.sin(t * Math.PI * 3) * 12 + Math.cos(t * Math.PI * 1.5) * 8;
      const height = t * 120;
      points.push(new THREE.Vector2(radius, height));
    }
    geo = new THREE.LatheGeometry(points, 48);
    // Apply twist
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const angle = (y / 120) * Math.PI * 1.2;
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      pos.setX(i, x * cosA - z * sinA);
      pos.setZ(i, x * sinA + z * cosA);
    }
    geo.computeVertexNormals();
    bounds = { x: 84, y: 84, z: 120 };
    volume = 125;
  } else if (type === 'stand') {
    // Desktop phone / tablet dock
    const shape = new THREE.Shape();
    shape.moveTo(-35, 0);
    shape.lineTo(40, 0);
    shape.lineTo(48, 12);
    shape.lineTo(15, 65);
    shape.lineTo(10, 65);
    shape.lineTo(-20, 18);
    shape.lineTo(-35, 18);
    shape.closePath();

    const extrudeSettings = {
      steps: 2,
      depth: 60,
      bevelEnabled: true,
      bevelThickness: 3,
      bevelSize: 2,
      bevelSegments: 4,
    };
    geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    bounds = { x: 88, y: 64, z: 65 };
    volume = 82;
  } else if (type === 'bracket') {
    // Drone motor mount / robotic bracket with screw holes
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 32, 0, Math.PI * 2, false);
    // Center hole for motor shaft
    const hole = new THREE.Path();
    hole.absarc(0, 0, 14, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    // 4 bolt holes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const boltHole = new THREE.Path();
      boltHole.absarc(Math.cos(angle) * 22, Math.sin(angle) * 22, 2.5, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    const extrudeSettings = {
      steps: 1,
      depth: 18,
      bevelEnabled: true,
      bevelThickness: 1.5,
      bevelSize: 1.5,
      bevelSegments: 3,
    };
    geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.computeVertexNormals();
    bounds = { x: 67, y: 67, z: 21 };
    volume = 48;
  } else if (type === 'gear') {
    // Precision involute gear
    const shape = new THREE.Shape();
    const teeth = 18;
    const outerR = 36;
    const innerR = 30;
    const rootR = 24;

    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.25) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const a4 = ((i + 0.75) / teeth) * Math.PI * 2;

      if (i === 0) shape.moveTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
      else shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);

      shape.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
      shape.lineTo(Math.cos(a2 + 0.05) * outerR, Math.sin(a2 + 0.05) * outerR);
      shape.lineTo(Math.cos(a3 - 0.05) * outerR, Math.sin(a3 - 0.05) * outerR);
      shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
      shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
    }
    shape.closePath();

    // Center hex bore
    const hexBore = new THREE.Path();
    const hexR = 9;
    for (let j = 0; j < 6; j++) {
      const ha = (j / 6) * Math.PI * 2;
      if (j === 0) hexBore.moveTo(Math.cos(ha) * hexR, Math.sin(ha) * hexR);
      else hexBore.lineTo(Math.cos(ha) * hexR, Math.sin(ha) * hexR);
    }
    hexBore.closePath();
    shape.holes.push(hexBore);

    const extrudeSettings = {
      steps: 1,
      depth: 14,
      bevelEnabled: true,
      bevelThickness: 1.2,
      bevelSize: 1.2,
      bevelSegments: 3,
    };
    geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.computeVertexNormals();
    bounds = { x: 74, y: 74, z: 16 };
    volume = 38;
  } else if (type === 'tag') {
    // Flat gift tag: rounded plate, string hole and a raised name-field panel
    const w = 70, h = 44, r = 8;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w / 2, h / 2 - r);
    shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    const eyelet = new THREE.Path();
    eyelet.absarc(-w / 2 + 11, 0, 3.5, 0, Math.PI * 2, true);
    shape.holes.push(eyelet);
    const plate = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false, curveSegments: 16 });

    const rim = new THREE.Shape();
    rim.moveTo(-18, -14); rim.lineTo(30, -14); rim.lineTo(30, 14); rim.lineTo(-18, 14); rim.closePath();
    const inner = new THREE.Path();
    inner.moveTo(-16.6, -12.6); inner.lineTo(-16.6, 12.6); inner.lineTo(28.6, 12.6); inner.lineTo(28.6, -12.6); inner.closePath();
    rim.holes.push(inner);
    const frame = new THREE.ExtrudeGeometry(rim, { depth: 1.2, bevelEnabled: false });
    frame.translate(0, 0, 2.4);

    const parts = [plate, frame].map((g) => g.toNonIndexed());
    const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
    const posArr = new Float32Array(total * 3);
    let off = 0;
    for (const g of parts) {
      posArr.set(g.attributes.position.array as Float32Array, off);
      off += g.attributes.position.count * 3;
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2); // lie flat on the build plate
    bounds = { x: 70, y: 44, z: 4 };
    volume = 7;
  } else {
    // Articulated dragon spine segment
    const groupGeo = new THREE.TorusKnotGeometry(24, 7, 72, 14, 2, 3);
    geo = groupGeo;
    bounds = { x: 62, y: 62, z: 32 };
    volume = 55;
  }

  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const height = bb.max.y - bb.min.y;
  geo.translate(0, height / 2, 0);

  const triangles = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;

  return { geometry: geo, triangles, bounds, volumeCm3: volume };
}
