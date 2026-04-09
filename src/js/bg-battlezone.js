// ═══════════════════════════════════════
// BATTLEZONE — rare (5%)
// Phosphor-green vector wireframe terrain. The "tank" advances forward
// with subtle turns. No crosshairs, no UI — just kinetic motion.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  const GREEN = 0x39ff7a;
  const BRIGHT_GREEN = 0x6cffaa;
  const DIM_GREEN = 0x0a4020;

  let renderer, scene, camera, raf = 0;
  let resizeHandler, mouseHandler;
  let world; // group containing terrain + obstacles, rotated for "turning"
  let gridLines;
  let obstacles = [];
  let mountainLine;

  // Drive state
  let yaw = 0;          // current applied yaw (mouse-driven)
  let mouseX = 0, mouseY = 0;
  let nextManeuverAt = 0;
  let speed = 60;       // forward units/sec
  let speedTarget = 60;

  function makeWirePyramid(size) {
    const h = size * 1.4;
    const verts = new Float32Array([
      -size, 0, -size,   size, 0, -size,
       size, 0, -size,   size, 0,  size,
       size, 0,  size,  -size, 0,  size,
      -size, 0,  size,  -size, 0, -size,
      -size, 0, -size,   0, h, 0,
       size, 0, -size,   0, h, 0,
       size, 0,  size,   0, h, 0,
      -size, 0,  size,   0, h, 0,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    return g;
  }

  function makeWireCube(size) {
    const s = size;
    const v = new Float32Array([
      // bottom square
      -s,0,-s,  s,0,-s,   s,0,-s,  s,0,s,   s,0,s, -s,0,s,  -s,0,s, -s,0,-s,
      // top square
      -s,2*s,-s,  s,2*s,-s,   s,2*s,-s,  s,2*s,s,   s,2*s,s, -s,2*s,s,  -s,2*s,s, -s,2*s,-s,
      // verticals
      -s,0,-s, -s,2*s,-s,   s,0,-s, s,2*s,-s,   s,0,s, s,2*s,s,   -s,0,s, -s,2*s,s,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    return g;
  }

  function makeWireTetra(size) {
    const s = size;
    const a = [ s,  0,  s];
    const b = [-s,  0,  s];
    const c = [ 0,  0, -s];
    const d = [ 0,  s*1.6, 0];
    const v = new Float32Array([
      ...a,...b,  ...b,...c,  ...c,...a,
      ...a,...d,  ...b,...d,  ...c,...d,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    return g;
  }

  function spawnObstacle(zRange) {
    const r = Math.random();
    let geo;
    if (r < 0.45) geo = makeWirePyramid(20 + Math.random() * 30);
    else if (r < 0.8) geo = makeWireCube(15 + Math.random() * 20);
    else geo = makeWireTetra(20 + Math.random() * 25);

    const mat = new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.45 });
    const line = new THREE.LineSegments(geo, mat);
    line.position.x = (Math.random() - 0.5) * 1400;
    line.position.z = -200 - Math.random() * zRange;
    line.position.y = 0;
    line.rotation.y = Math.random() * Math.PI;
    world.add(line);
    obstacles.push(line);
  }

  function buildGrid() {
    // Custom grid as LineSegments so we can scroll it.
    const SIZE = 2400;
    const STEP = 80;
    const half = SIZE / 2;
    const positions = [];
    for (let x = -half; x <= half; x += STEP) {
      positions.push(x, 0, -half,  x, 0, half);
    }
    for (let z = -half; z <= half; z += STEP) {
      positions.push(-half, 0, z,  half, 0, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: DIM_GREEN, transparent: true, opacity: 0.9 });
    gridLines = new THREE.LineSegments(g, mat);
    gridLines.position.y = -40;
    world.add(gridLines);
  }

  function buildMountains() {
    // A jagged horizon polyline placed far away in Z.
    const positions = [];
    const SEGMENTS = 80;
    const SPAN = 4000;
    const Z = -1700;
    let prevX = -SPAN / 2;
    let prevY = 60 + Math.random() * 80;
    for (let i = 1; i <= SEGMENTS; i++) {
      const x = -SPAN / 2 + (i / SEGMENTS) * SPAN;
      const y = 40 + Math.random() * 220;
      positions.push(prevX, prevY, Z, x, y, Z);
      prevX = x; prevY = y;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: BRIGHT_GREEN, transparent: true, opacity: 0.95 });
    mountainLine = new THREE.LineSegments(g, mat);
    scene.add(mountainLine);
  }

  function init() {
    const canvas = document.getElementById('bg');
    if (!canvas || !window.THREE) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // transparent — let body bg show through

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050510, 600, 2400);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 50, 0);
    camera.lookAt(0, 50, -100);

    world = new THREE.Group();
    scene.add(world);

    buildGrid();
    buildMountains();

    for (let i = 0; i < 22; i++) spawnObstacle(1800);

    resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);

    mouseHandler = e => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener('mousemove', mouseHandler);

    let last = performance.now();
    nextManeuverAt = performance.now() + 2500 + Math.random() * 2000;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Maneuver scheduler now only varies forward speed — turning is mouse-driven.
      if (now > nextManeuverAt) {
        const r = Math.random();
        if (r < 0.7)      speedTarget = 60;
        else if (r < 0.9) speedTarget = 25; // slow scan
        else              speedTarget = 90; // burst
        nextManeuverAt = now + 2500 + Math.random() * 3500;
      }
      // Mouse-driven yaw with easing — same feel as the starfield's parallax.
      const yawTarget = -mouseX * 0.5;
      yaw += (yawTarget - yaw) * 0.04;
      speed += (speedTarget - speed) * 0.01;

      // Scroll the grid by sliding its position then wrapping.
      gridLines.position.z += speed * dt;
      if (gridLines.position.z > 80) gridLines.position.z -= 80;

      // Advance obstacles toward the camera; recycle when behind.
      for (const o of obstacles) {
        o.position.z += speed * dt;
        if (o.position.z > 200) {
          o.position.z = -1800 - Math.random() * 400;
          o.position.x = (Math.random() - 0.5) * 1400;
          o.rotation.y = Math.random() * Math.PI;
        }
      }

      // Apply yaw by rotating the world group around the camera.
      world.rotation.y = yaw;
      // Mountains drift opposite to yaw at a fraction (parallax).
      mountainLine.rotation.y = yaw * 0.6;

      // Subtle camera bob like a tracked vehicle, plus vertical mouse parallax.
      camera.position.y = 50 + Math.sin(now * 0.004) * 1.2 + (-mouseY * 8);

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    obstacles.forEach(o => {
      o.geometry.dispose();
      o.material.dispose();
    });
    obstacles = [];
    if (gridLines) { gridLines.geometry.dispose(); gridLines.material.dispose(); }
    if (mountainLine) { mountainLine.geometry.dispose(); mountainLine.material.dispose(); }
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss && renderer.forceContextLoss();
    }
    renderer = scene = camera = world = gridLines = mountainLine = null;
    mouseHandler = resizeHandler = null;
    yaw = 0;
    mouseX = mouseY = 0;
    speed = speedTarget = 60;
  }

  window.Atmospheres.battlezone = { init, destroy };
})();
