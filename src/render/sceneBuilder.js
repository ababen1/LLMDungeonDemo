import * as THREE from 'three';
import { COLORS, TYPE_LABELS } from './colors.js';

const CUBE_GEOMETRY = new THREE.BoxGeometry(1, 0.5, 1);

/**
 * @param {object} dungeon
 * @returns {THREE.Group}
 */
export function buildScene(dungeon) {
  const group = new THREE.Group();
  const [gridW, gridH] = dungeon.metadata.gridSize;
  const occupied = new Set();

  const materials = {
    spawn: new THREE.MeshBasicMaterial({ color: COLORS.spawn }),
    exit: new THREE.MeshBasicMaterial({ color: COLORS.exit }),
    key: new THREE.MeshBasicMaterial({ color: COLORS.key }),
    treasure: new THREE.MeshBasicMaterial({ color: COLORS.treasure }),
    connector: new THREE.MeshBasicMaterial({ color: COLORS.connector }),
    corridor: new THREE.MeshBasicMaterial({ color: COLORS.corridor }),
    wall: new THREE.MeshBasicMaterial({ color: COLORS.wall }),
    lockedDoor: new THREE.MeshBasicMaterial({ color: COLORS.lockedDoor }),
  };

  function addCube(x, y, material) {
    const key = `${x},${y}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    const mesh = new THREE.Mesh(CUBE_GEOMETRY, material);
    mesh.position.set(x + 0.5, 0.25, y + 0.5);
    group.add(mesh);
  }

  for (const room of dungeon.rooms) {
    const [rx, ry] = room.pos;
    const [rw, rh] = room.size;
    const floorMat = materials[room.type] ?? materials.connector;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const onPerimeter = x === rx || x === rx + rw - 1 || y === ry || y === ry + rh - 1;
        addCube(x, y, onPerimeter ? materials.wall : floorMat);
      }
    }

    const label = TYPE_LABELS[room.type] ?? room.type;
    if (room.type !== 'connector') {
      group.add(createTextSprite(label, rx + rw / 2, ry + rh / 2, rw, rh));
    }
  }

  const doorPos = dungeon.doors[0]?.position;
  const doorKey = doorPos ? `${doorPos[0]},${doorPos[1]}` : null;

  for (const corridor of dungeon.corridors) {
    for (const [x, y] of corridor.path) {
      const key = `${x},${y}`;
      if (key === doorKey) continue;
      if (!occupied.has(key)) {
        addCube(x, y, materials.corridor);
      }
    }
  }

  if (doorPos) {
    occupied.delete(doorKey);
    addCube(doorPos[0], doorPos[1], materials.lockedDoor);
    group.add(createTextSprite(TYPE_LABELS.lockedDoor, doorPos[0] + 0.5, doorPos[1] + 0.5, 1.5, 1.5));
  }

  group.userData.gridSize = [gridW, gridH];
  return group;
}

/**
 * Billboard text label for top-down view.
 */
function createTextSprite(text, cx, cz, rw, rh) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Group();

  const fontSize = 15;
  const padding = 8;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = fontSize + padding;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(cx, 1.5, cz);
  sprite.renderOrder = 10;

  const aspect = canvas.width / canvas.height;
  const baseScale = Math.min(Math.max(rw, rh) * 0.42, 2.4);
  sprite.scale.set(baseScale * aspect, baseScale, 1);

  sprite.userData.isLabel = true;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material?.dispose();
      }
    }
    if (obj instanceof THREE.Sprite) {
      obj.material?.map?.dispose();
      obj.material?.dispose();
    }
  });
}
