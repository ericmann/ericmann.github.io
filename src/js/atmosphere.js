// ═══════════════════════════════════════
// STARFIELD BACKGROUND (Three.js)
// ═══════════════════════════════════════
(function() {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 800;

  const STAR_COUNT = 3000;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 2000;
    positions[i*3+1] = (Math.random() - 0.5) * 2000;
    positions[i*3+2] = (Math.random() - 0.5) * 2000;
    const c = 0.7 + Math.random() * 0.3;
    const tint = Math.random();
    colors[i*3]   = tint > 0.9 ? 0.5 : c;
    colors[i*3+1] = tint > 0.95 ? 0.7 : c;
    colors[i*3+2] = c;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // Nebula clouds
  const nebGeo = new THREE.BufferGeometry();
  const nebCount = 200;
  const nebPos = new Float32Array(nebCount * 3);
  const nebCol = new Float32Array(nebCount * 3);
  for (let i = 0; i < nebCount; i++) {
    nebPos[i*3]   = (Math.random() - 0.5) * 1800;
    nebPos[i*3+1] = (Math.random() - 0.5) * 1200;
    nebPos[i*3+2] = -800 - Math.random() * 600;
    if (Math.random() > 0.5) {
      nebCol[i*3] = 0; nebCol[i*3+1] = 0.9; nebCol[i*3+2] = 1;
    } else {
      nebCol[i*3] = 1; nebCol[i*3+1] = 0; nebCol[i*3+2] = 0.67;
    }
  }
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));
  scene.add(new THREE.Points(nebGeo, new THREE.PointsMaterial({
    size: 40, vertexColors: true, transparent: true, opacity: 0.04, sizeAttenuation: true,
  })));

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    const posArr = starGeo.attributes.position.array;
    for (let i = 0; i < STAR_COUNT; i++) {
      posArr[i*3+2] += 15 * dt;
      if (posArr[i*3+2] > 1000) {
        posArr[i*3+2] = -1000;
        posArr[i*3]   = (Math.random() - 0.5) * 2000;
        posArr[i*3+1] = (Math.random() - 0.5) * 2000;
      }
    }
    starGeo.attributes.position.needsUpdate = true;

    camera.position.x += (mouseX * 40 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 40 - camera.position.y) * 0.02;
    camera.rotation.z = Math.sin(t * 0.1) * 0.01;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

// ═══════════════════════════════════════
// SHOOTING STARS (2D Canvas)
// ═══════════════════════════════════════
(function() {
  const c = document.getElementById('fx');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H;
  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const meteors = [];
  function spawnMeteor() {
    const x = Math.random() * W * 1.2;
    const angle = 0.6 + Math.random() * 0.4;
    const speed = 400 + Math.random() * 600;
    meteors.push({
      x, y: -20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.6 + Math.random() * 0.8,
      len: 60 + Math.random() * 100,
    });
  }

  let lastTime = performance.now();
  function drawFrame(now) {
    requestAnimationFrame(drawFrame);
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    ctx.clearRect(0, 0, W, H);

    if (Math.random() < 0.004) spawnMeteor();

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= m.decay * dt;
      if (m.life <= 0 || m.x > W + 100 || m.y > H + 100) { meteors.splice(i, 1); continue; }

      const alpha = m.life;
      const hyp = Math.hypot(m.vx, m.vy);
      const tailX = m.x - (m.vx / hyp) * m.len;
      const tailY = m.y - (m.vy / hyp) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
      grad.addColorStop(0.3, `rgba(200,230,255,${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(100,180,255,0)');

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = '#aaddff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  requestAnimationFrame(drawFrame);
})();

// ═══════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════
(function() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
})();
