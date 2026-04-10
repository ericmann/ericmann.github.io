// ═══════════════════════════════════════
// TESSERACT — rare
// A 4D hypercube projected into 3D, rotating in the xw and yw planes
// (the rotations that mix the fourth dimension with our familiar three).
// Two nested tesseracts at different scales add depth.
// ═══════════════════════════════════════
(function() {
  window.Atmospheres = window.Atmospheres || {};

  let renderer, scene, camera, raf = 0, resizeHandler, mouseHandler;
  let outerLines, innerLines;
  let outerVerts4D, innerVerts4D;
  let outerEdges, innerEdges;
  let mouseX = 0, mouseY = 0;

  function makeTesseractVertices(scale) {
    const v = [];
    for (let i = 0; i < 16; i++) {
      v.push([
        ((i & 1) ? 1 : -1) * scale,
        ((i & 2) ? 1 : -1) * scale,
        ((i & 4) ? 1 : -1) * scale,
        ((i & 8) ? 1 : -1) * scale,
      ]);
    }
    return v;
  }

  function makeTesseractEdges() {
    const edges = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const diff = i ^ j;
        if (diff && (diff & (diff - 1)) === 0) edges.push([i, j]);
      }
    }
    return edges;
  }

  function rotXW(p, c, s) { const x = p[0], w = p[3]; p[0] = x*c - w*s; p[3] = x*s + w*c; }
  function rotYW(p, c, s) { const y = p[1], w = p[3]; p[1] = y*c - w*s; p[3] = y*s + w*c; }
  function rotZW(p, c, s) { const z = p[2], w = p[3]; p[2] = z*c - w*s; p[3] = z*s + w*c; }
  function rotXY(p, c, s) { const x = p[0], y = p[1]; p[0] = x*c - y*s; p[1] = x*s + y*c; }

  function project(p, distance) {
    const k = distance / (distance - p[3]);
    return [p[0] * k, p[1] * k, p[2] * k];
  }

  function buildLineGeometry(verts4D, edges, distance) {
    const positions = new Float32Array(edges.length * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    updateLineGeometry(geo, verts4D, edges, distance);
    return geo;
  }

  function updateLineGeometry(geo, verts4D, edges, distance) {
    const arr = geo.attributes.position.array;
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];
      const pa = project(verts4D[a], distance);
      const pb = project(verts4D[b], distance);
      arr[e*6]   = pa[0]; arr[e*6+1] = pa[1]; arr[e*6+2] = pa[2];
      arr[e*6+3] = pb[0]; arr[e*6+4] = pb[1]; arr[e*6+5] = pb[2];
    }
    geo.attributes.position.needsUpdate = true;
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
    camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
    camera.position.set(0, 0, 6);

    outerVerts4D = makeTesseractVertices(1.0);
    innerVerts4D = makeTesseractVertices(0.55);
    outerEdges = makeTesseractEdges();
    innerEdges = makeTesseractEdges();

    const outerGeo = buildLineGeometry(outerVerts4D, outerEdges, 4);
    const innerGeo = buildLineGeometry(innerVerts4D, innerEdges, 4);

    outerLines = new THREE.LineSegments(
      outerGeo,
      new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7 })
    );
    innerLines = new THREE.LineSegments(
      innerGeo,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 })
    );
    scene.add(outerLines);
    scene.add(innerLines);

    if (!preview) {
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
    }

    let last = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000; last = now;

      const mouseBoost = 1 + Math.abs(mouseX) * 2 + Math.abs(mouseY) * 2;
      const a = dt * 0.175 * mouseBoost * (mouseX >= 0 ? 1 : -1);
      const b = dt * 0.105 * mouseBoost * (mouseY >= 0 ? 1 : -1);
      const c = dt * 0.04;
      const ca = Math.cos(a), sa = Math.sin(a);
      const cb = Math.cos(b), sb = Math.sin(b);
      const cc = Math.cos(c), sc = Math.sin(c);

      for (const p of outerVerts4D) {
        rotXW(p, ca, sa);
        rotYW(p, cb, sb);
        rotXY(p, cc, sc);
      }
      updateLineGeometry(outerLines.geometry, outerVerts4D, outerEdges, 4);

      const ica = Math.cos(-a * 0.7), isa = Math.sin(-a * 0.7);
      const icb = Math.cos( b * 0.5), isb = Math.sin( b * 0.5);
      for (const p of innerVerts4D) {
        rotZW(p, ica, isa);
        rotXW(p, icb, isb);
      }
      updateLineGeometry(innerLines.geometry, innerVerts4D, innerEdges, 4);

      const t = now * 0.00015;
      outerLines.rotation.z = Math.sin(t) * 0.15;
      innerLines.rotation.z = -Math.sin(t * 1.3) * 0.2;
      const pulse = 1 + Math.sin(now * 0.0004) * 0.04;
      outerLines.scale.setScalar(pulse);

      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.04;
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
    if (outerLines) { outerLines.geometry.dispose(); outerLines.material.dispose(); }
    if (innerLines) { innerLines.geometry.dispose(); innerLines.material.dispose(); }
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss && renderer.forceContextLoss();
    }
    renderer = scene = camera = outerLines = innerLines = null;
    outerVerts4D = innerVerts4D = outerEdges = innerEdges = null;
    mouseHandler = resizeHandler = null;
    mouseX = mouseY = 0;
  }

  window.Atmospheres.tesseract = { init, destroy };
})();
