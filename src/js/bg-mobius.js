// ═══════════════════════════════════════
// MOBIUS — rare
// A warped, inverted torus-knot tube slowly rotating in 3D space.
// Built as a hand-rolled parametric surface with a half-twist cross-section,
// then rendered as a wireframe so the topology reads clearly even at low opacity.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let renderer, scene, camera, raf = 0, resizeHandler;
  let mesh, innerMesh;
  let mouseX = 0, mouseY = 0, mouseHandler;

  function makeMobiusTube(R, r, segU, segV) {
    const positions = [];
    const grid = [];
    let idx = 0;
    for (let i = 0; i <= segU; i++) {
      grid[i] = [];
      const u = (i / segU) * Math.PI * 2;
      const cu = Math.cos(u), su = Math.sin(u);
      const halfU = u / 2;
      const ch = Math.cos(halfU), sh = Math.sin(halfU);

      const ex =  cu * ch;
      const ey =  su * ch;
      const ez =  sh;
      const fx = -cu * sh;
      const fy = -su * sh;
      const fz =  ch;

      const cx = R * cu;
      const cy = R * su;

      for (let j = 0; j <= segV; j++) {
        const v = (j / segV) * Math.PI * 2;
        const cv = Math.cos(v), sv = Math.sin(v);
        const x = cx + r * (ex * cv + fx * sv);
        const y = cy + r * (ey * cv + fy * sv);
        const z =       r * (ez * cv + fz * sv);
        positions.push(x, y, z);
        grid[i][j] = idx++;
      }
    }

    const lines = [];
    const pushLine = (a, b) => lines.push(
      positions[a*3], positions[a*3+1], positions[a*3+2],
      positions[b*3], positions[b*3+1], positions[b*3+2]
    );
    for (let i = 0; i < segU; i++) {
      for (let j = 0; j <= segV; j++) {
        if (j % 2 === 0) pushLine(grid[i][j], grid[i+1][j]);
      }
    }
    for (let i = 0; i <= segU; i += 2) {
      for (let j = 0; j < segV; j++) {
        pushLine(grid[i][j], grid[i][j+1]);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return geo;
  }

  function init(opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const canvas = opts.canvas || document.getElementById('bg');
    const width  = opts.width  || window.innerWidth;
    const height = opts.height || window.innerHeight;
    if (!canvas || !window.THREE) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: !preview, alpha: true });
    renderer.setPixelRatio(preview ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, width / height, 1, 2000);
    camera.position.set(0, 0, 320);

    const outerSegU = preview ? 120 : 240;
    const outerSegV = preview ? 12 : 24;
    const outerGeo = makeMobiusTube(100, 30, outerSegU, outerSegV);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.55,
    });
    mesh = new THREE.LineSegments(outerGeo, outerMat);
    scene.add(mesh);

    const innerSegU = preview ? 80 : 160;
    const innerSegV = preview ? 9 : 18;
    const innerGeo = makeMobiusTube(100, 22, innerSegU, innerSegV);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0xff00aa, transparent: true, opacity: 0.18,
    });
    innerMesh = new THREE.LineSegments(innerGeo, innerMat);
    scene.add(innerMesh);

    if (!preview) {
      mouseHandler = e => {
        mouseX = (e.clientX / window.innerWidth - 0.5);
        mouseY = (e.clientY / window.innerHeight - 0.5);
      };
      document.addEventListener('mousemove', mouseHandler);

      resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeHandler);
    }

    let last = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000; last = now;
      const t = now * 0.001;

      mesh.rotation.x += dt * 0.07;
      mesh.rotation.y += dt * 0.11;
      mesh.rotation.z = Math.sin(t * 0.13) * 0.2;

      innerMesh.rotation.x = -mesh.rotation.x * 0.6;
      innerMesh.rotation.y =  mesh.rotation.y * 1.3;
      innerMesh.rotation.z = -mesh.rotation.z;

      camera.position.x += (mouseX * 30 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 30 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (mouseHandler) document.removeEventListener('mousemove', mouseHandler);
    if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
    if (innerMesh) { innerMesh.geometry.dispose(); innerMesh.material.dispose(); }
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss && renderer.forceContextLoss();
    }
    renderer = scene = camera = mesh = innerMesh = null;
    mouseHandler = resizeHandler = null;
  }

  window.Atmospheres.mobius = { init, destroy };
})();
