"use client";

import { useEffect, useRef } from "react";

// Creates one diamond group: shallow crown cone (top) + deep pavilion cone (bottom)
// + LineSegments on EdgesGeometry so the facet lines are crisp, not messy wireframe
function makeDiamond(THREE, fillColor, edgeColor) {
  const group = new THREE.Group();

  const solidMat = new THREE.MeshPhongMaterial({
    color:       new THREE.Color(fillColor),
    emissive:    new THREE.Color(0x0e0208),
    specular:    new THREE.Color(0xffffff),
    shininess:   220,
    transparent: true,
    opacity:     0.14 + Math.random() * 0.18,
    side:        THREE.DoubleSide,
  });

  const edgeMat = new THREE.LineBasicMaterial({
    color:       new THREE.Color(edgeColor),
    transparent: true,
    opacity:     0.5 + Math.random() * 0.35,
  });

  // ── Crown: shallow cone, 8 sides, point UP ───────────────────────
  // radius 0.5, height 0.38, thetaStart = PI/8 to align facets nicely
  const crownGeo = new THREE.ConeGeometry(0.5, 0.38, 8, 1, false, Math.PI / 8);

  const crownSolid = new THREE.Mesh(crownGeo, solidMat);
  crownSolid.position.y = 0.19; // base of crown sits at y = 0
  group.add(crownSolid);

  const crownEdge = new THREE.LineSegments(new THREE.EdgesGeometry(crownGeo), edgeMat);
  crownEdge.position.y = 0.19;
  group.add(crownEdge);

  // ── Pavilion: deep cone, 8 sides, point DOWN ─────────────────────
  // Rotated 180° on X so it hangs below; offset facets by PI/8 vs crown
  const pavilionGeo = new THREE.ConeGeometry(0.5, 0.72, 8, 1, false, 0);

  const pavilionGroup = new THREE.Group();
  pavilionGroup.rotation.x = Math.PI;       // flip so point faces down
  pavilionGroup.rotation.y = Math.PI / 8;   // stagger facets against crown
  pavilionGroup.position.y = -0.36;         // base of pavilion at y = 0

  const pavilionSolid = new THREE.Mesh(pavilionGeo, solidMat);
  pavilionGroup.add(pavilionSolid);

  const pavilionEdge = new THREE.LineSegments(new THREE.EdgesGeometry(pavilionGeo), edgeMat);
  pavilionGroup.add(pavilionEdge);

  group.add(pavilionGroup);

  return group;
}

export default function GemBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let dispose   = null;

    import("three").then((THREE) => {
      if (cancelled) return;

      // ── Renderer ──────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.z = 26;

      // ── Lighting ──────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));

      const roseLight = new THREE.PointLight(0xd878b0, 6, 90);
      roseLight.position.set(8, 10, 18);
      scene.add(roseLight);

      const blueLight = new THREE.PointLight(0x2244aa, 5, 90);
      blueLight.position.set(-12, -8, 14);
      scene.add(blueLight);

      const topLight = new THREE.PointLight(0xffd8f0, 3, 60);
      topLight.position.set(0, 16, 20);
      scene.add(topLight);

      // ── Diamond palette (fill + edge pairs) ───────────────────────
      const palette = [
        { fill: 0xc46ea1, edge: 0xf0b8d8 },   // rose
        { fill: 0xa0507a, edge: 0xe0a0c8 },   // deep rose
        { fill: 0x7a3060, edge: 0xcc88b8 },   // plum
        { fill: 0xd890c0, edge: 0xffd6f0 },   // blush
        { fill: 0x1e3a7a, edge: 0x78aae8 },   // sapphire accent
        { fill: 0xe8b0d8, edge: 0xfff0f8 },   // pale pink
      ];

      // ── Spawn gems ────────────────────────────────────────────────
      const gems = [];

      for (let i = 0; i < 26; i++) {
        const col   = palette[i % palette.length];
        const size  = 0.15 + Math.random() * 0.85; // keep them gem-sized, not building-sized
        const group = makeDiamond(THREE, col.fill, col.edge);

        group.scale.set(size, size, size);

        group.position.set(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 36,
          (Math.random() - 0.5) * 14 - 6   // mostly behind scene centre
        );

        // Random initial tilt — diamonds tumbling in space
        group.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );

        scene.add(group);

        gems.push({
          group,
          rx:       (Math.random() - 0.5) * 0.006,
          ry:       (Math.random() - 0.5) * 0.009,
          rz:       (Math.random() - 0.5) * 0.004,
          floatOff: Math.random() * Math.PI * 2,
          floatSpd: 0.18 + Math.random() * 0.42,
          floatAmp: 0.3  + Math.random() * 1.1,
          initY:    group.position.y,
        });
      }

      // ── Mouse parallax ────────────────────────────────────────────
      const mouse = { tx: 0, ty: 0, cx: 0, cy: 0 };
      const onMouse = (e) => {
        mouse.tx =  (e.clientX / window.innerWidth  - 0.5) * 7;
        mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 4;
      };
      window.addEventListener("mousemove", onMouse);

      // ── Resize ────────────────────────────────────────────────────
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      // ── Animate ───────────────────────────────────────────────────
      let raf;
      let t = 0;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        t  += 0.016;

        for (const g of gems) {
          g.group.rotation.x += g.rx;
          g.group.rotation.y += g.ry;
          g.group.rotation.z += g.rz;
          g.group.position.y  = g.initY + Math.sin(t * g.floatSpd + g.floatOff) * g.floatAmp;
        }

        mouse.cx += (mouse.tx - mouse.cx) * 0.032;
        mouse.cy += (mouse.ty - mouse.cy) * 0.032;
        camera.position.x = mouse.cx;
        camera.position.y = mouse.cy;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      tick();

      // ── Cleanup ───────────────────────────────────────────────────
      dispose = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize",    onResize);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return <div ref={mountRef} className="gem-bg" aria-hidden="true" />;
}
