// ═══════════════════════════════════════
// VAPORWAVE — super rare (0.5%) — the easter egg
// Endless magenta grid scrolling toward a neon sun on the horizon,
// with wireframe mountains and floating chevrons. The fun one.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  const MAGENTA = 0xff00aa;
  const CYAN = 0x00f0ff;

  let renderer, scene, camera, raf = 0, resizeHandler, mouseHandler;
  let gridLines, gridLines2, mountains, mountains2;
  let sunMesh;
  let chevrons = [];
  let mouseX = 0, mouseY = 0;
  let yaw = 0;

  // Build a CanvasTexture for the sun: vertical gradient (yellow → magenta)
  // with horizontal bars cut out for that signature synthwave look.
  function makeSunTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#fff27a');
    grad.addColorStop(0.4, '#ff9c4a');
    grad.addColorStop(0.75, '#ff2e88');
    grad.addColorStop(1.0, '#a020a0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    // Horizontal bars cut out of the lower half.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) {
      const y = 140 + i * 14 + i * 1.5;
      const h = 4 + i * 1.2;
      ctx.fillRect(0, y, 256, h);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildGrid(color, opacity, yOffset, span, step) {
    const positions = [];
    const half = span / 2;
    for (let x = -half; x <= half; x += step) positions.push(x, 0, -half,  x, 0, half);
    for (let z = -half; z <= half; z += step) positions.push(-half, 0, z,  half, 0, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color, transparent: true, opacity,
    }));
    lines.position.y = yOffset;
    return lines;
  }

  function buildMountains(color, z, opacity, jitter) {
    const positions = [];
    const SEGMENTS = 60;
    const SPAN = 4000;
    let prevX = -SPAN / 2;
    let prevY = 80 + Math.random() * jitter;
    for (let i = 1; i <= SEGMENTS; i++) {
      const x = -SPAN / 2 + (i / SEGMENTS) * SPAN;
      const y = 80 + Math.random() * jitter;
      positions.push(prevX, prevY, z, x, y, z);
      prevX = x; prevY = y;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color, transparent: true, opacity,
    }));
  }

  function buildChevron(color) {
    // A floating low-poly diamond — just two triangles outlined.
    const s = 30;
    const v = new Float32Array([
      0, s, 0,   s, 0, 0,
      s, 0, 0,   0,-s, 0,
      0,-s, 0,  -s, 0, 0,
     -s, 0, 0,   0, s, 0,
      // inner cross
      0, s, 0,   0,-s, 0,
     -s, 0, 0,   s, 0, 0,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
    return new THREE.LineSegments(g, m);
  }

  function init() {
    const canvas = document.getElementById('bg');
    if (!canvas || !window.THREE) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x12001a, 800, 2400);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 80, 0);
    camera.lookAt(0, 80, -100);

    // Two grids stacked: bright magenta foreground + cyan offset for the parallax.
    gridLines  = buildGrid(MAGENTA, 0.85, -20, 3200, 100);
    gridLines2 = buildGrid(CYAN,    0.30, -22, 3200, 200);
    scene.add(gridLines);
    scene.add(gridLines2);

    // Distant mountains in two layers.
    mountains  = buildMountains(MAGENTA, -2200, 0.6, 280);
    mountains2 = buildMountains(CYAN,    -2400, 0.35, 200);
    scene.add(mountains);
    scene.add(mountains2);

    // The sun: a billboarded plane with a gradient canvas texture.
    const sunTex = makeSunTexture();
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex, transparent: true, depthWrite: false,
    });
    const sunGeo = new THREE.PlaneGeometry(900, 900);
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 280, -2300);
    scene.add(sunMesh);

    // Floating chevrons drifting in front of the sun.
    for (let i = 0; i < 8; i++) {
      const ch = buildChevron(i % 2 === 0 ? CYAN : MAGENTA);
      ch.position.set(
        (Math.random() - 0.5) * 1600,
        100 + Math.random() * 250,
        -600 - Math.random() * 1200
      );
      ch.userData.spin = (Math.random() - 0.5) * 0.6;
      ch.userData.bob = Math.random() * Math.PI * 2;
      scene.add(ch);
      chevrons.push(ch);
    }

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
    const SPEED = 220; // outrun cruising speed

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      // Scroll the grids forward.
      gridLines.position.z  += SPEED * dt;
      gridLines2.position.z += SPEED * 0.5 * dt;
      if (gridLines.position.z  > 100) gridLines.position.z  -= 100;
      if (gridLines2.position.z > 200) gridLines2.position.z -= 200;

      // Chevrons drift forward + slow spin + bob.
      for (const ch of chevrons) {
        ch.position.z += SPEED * 0.4 * dt;
        ch.rotation.z += ch.userData.spin * dt;
        ch.position.y += Math.sin(t + ch.userData.bob) * 0.4;
        if (ch.position.z > 200) {
          ch.position.z = -1800;
          ch.position.x = (Math.random() - 0.5) * 1600;
        }
      }

      // Sun gently bobs to feel alive.
      sunMesh.position.y = 280 + Math.sin(t * 0.5) * 6;

      // Mouse-driven yaw: pan the world so the sun glides past as you move.
      const yawTarget = -mouseX * 0.4;
      yaw += (yawTarget - yaw) * 0.04;
      camera.rotation.y = yaw;

      // Camera bob + vertical mouse parallax.
      camera.position.y = 80 + Math.sin(t * 1.2) * 1.5 + (-mouseY * 12);
      camera.rotation.z = Math.sin(t * 0.2) * 0.005;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    [gridLines, gridLines2, mountains, mountains2, sunMesh, ...chevrons].forEach(o => {
      if (!o) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    chevrons = [];
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss && renderer.forceContextLoss();
    }
    renderer = scene = camera = null;
    gridLines = gridLines2 = mountains = mountains2 = sunMesh = null;
    mouseHandler = resizeHandler = null;
    mouseX = mouseY = 0;
    yaw = 0;
  }

  window.Atmospheres.vaporwave = { init, destroy };
})();
