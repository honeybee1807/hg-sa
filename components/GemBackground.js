"use client";

// the animated field of slowly tumbling, softly glowing gemstones behind
// the homepage hero section. built with Three.js (a 3D graphics library) —
// this is purely decorative, has no interactive purpose beyond a gentle
// mouse-parallax effect, and is loaded only in the browser (dynamically
// imported below) since 3D rendering doesn't apply to server-rendered
// HTML.

import { useEffect, useRef } from "react";

// builds one 3D gemstone shape, made of two cone shapes stacked point to
// point (like two ice-cream cones glued base-to-base) — a shallow "crown"
// cone on top and a deeper "pavilion" cone underneath, which together
// roughly resemble a cut diamond. each cone is drawn twice: once as a
// softly see-through solid shape for the body of the gem, and once as a
// set of crisp outline edges on top, so the facet lines stay sharp instead
// of looking like a messy wireframe.
function makeDiamond(THREE, fillColor, edgeColor) {
  const gemGroup = new THREE.Group(); // holds both halves of the gem together as one movable unit

  // the see-through, glossy material used for the body of both cones.
  const solidMaterial = new THREE.MeshPhongMaterial({
    color:       new THREE.Color(fillColor),
    emissive:    new THREE.Color(0x0e0208), // a faint self-glow so the gems aren't pitch black in shadow
    specular:    new THREE.Color(0xffffff), // white highlights, for a glassy sheen
    shininess:   220,
    transparent: true,
    opacity:     0.14 + Math.random() * 0.18, // each gem gets a slightly different, random transparency
    side:        THREE.DoubleSide, // render both the front and back faces, since the shape is see-through
  });

  // the material used for the crisp facet outline on top of each solid cone.
  const edgeMaterial = new THREE.LineBasicMaterial({
    color:       new THREE.Color(edgeColor),
    transparent: true,
    opacity:     0.5 + Math.random() * 0.35, // each gem's outline is also randomly varied
  });

  // ── crown: the shallow upper cone, point facing up ──────────────────
  // radius 0.5, height 0.38, 8 flat sides. the rotation offset (PI/8) just
  // spins the starting angle of the facets so they line up nicely.
  const crownGeometry = new THREE.ConeGeometry(0.5, 0.38, 8, 1, false, Math.PI / 8);

  const crownSolid = new THREE.Mesh(crownGeometry, solidMaterial);
  crownSolid.position.y = 0.19; // shifts the cone up so its flat base sits exactly at y = 0
  gemGroup.add(crownSolid);

  const crownEdgeOutline = new THREE.LineSegments(new THREE.EdgesGeometry(crownGeometry), edgeMaterial);
  crownEdgeOutline.position.y = 0.19;
  gemGroup.add(crownEdgeOutline);

  // ── pavilion: the deeper lower cone, point facing down ──────────────
  // this cone is built pointing the same way as the crown, then the whole
  // group holding it is flipped upside down (rotated 180°) so it hangs
  // below the crown instead. its facets are also rotated slightly
  // (PI/8) relative to the crown's, so they don't line up exactly —
  // that stagger is what makes the gem look faceted rather than like a
  // single smooth cone shape.
  const pavilionGeometry = new THREE.ConeGeometry(0.5, 0.72, 8, 1, false, 0);

  const pavilionGroup = new THREE.Group();
  pavilionGroup.rotation.x = Math.PI;       // flip upside down so the point faces down
  pavilionGroup.rotation.y = Math.PI / 8;   // stagger the facets against the crown's
  pavilionGroup.position.y = -0.36;         // shifts the cone down so its flat base sits exactly at y = 0

  const pavilionSolid = new THREE.Mesh(pavilionGeometry, solidMaterial);
  pavilionGroup.add(pavilionSolid);

  const pavilionEdgeOutline = new THREE.LineSegments(new THREE.EdgesGeometry(pavilionGeometry), edgeMaterial);
  pavilionGroup.add(pavilionEdgeOutline);

  gemGroup.add(pavilionGroup);

  return gemGroup;
}

export default function GemBackground() {
  const mountRef = useRef(null); // points at the empty <div> below that the 3D canvas gets attached into

  useEffect(() => {
    const mountElement = mountRef.current;
    if (!mountElement) return;

    // these two flags/variables protect against a timing problem: three.js
    // is loaded asynchronously below (import("three")), and if this
    // component is removed from the page before that finishes loading,
    // there would be nothing left to clean up. "cancelled" tells the
    // loading callback to stop early if that happens, and "cleanupScene"
    // holds the real cleanup function once the scene actually exists.
    let cancelled = false;
    let cleanupScene = null;

    import("three").then((THREE) => {
      if (cancelled) return;

      // ── renderer: the thing that actually draws the 3D scene onto a
      // canvas element and adds that canvas into the page ──────────────
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mountElement.appendChild(renderer.domElement);

      // the "scene" holds every 3D object; the "camera" is the virtual
      // viewpoint looking into that scene.
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.z = 26;

      // ── lighting: a soft overall ambient light, plus three coloured
      // point lights positioned around the scene so the gems catch
      // different colours of light depending on their angle ────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));

      const amethystLight = new THREE.PointLight(0x9966cc, 6, 90);
      amethystLight.position.set(8, 10, 18);
      scene.add(amethystLight);

      const sapphireLight = new THREE.PointLight(0x1f94d2, 5, 90);
      sapphireLight.position.set(-12, -8, 14);
      scene.add(sapphireLight);

      const topLight = new THREE.PointLight(0xd8f0ea, 3, 60);
      topLight.position.set(0, 16, 20);
      scene.add(topLight);

      // ── the set of colours each gem can be drawn in, matched to the
      // site's gem-inspired palette. each entry has a "fill" (the body
      // colour) and a lighter "edge" (the facet-outline colour) ─────────
      const gemColorPalette = [
        { fill: 0x9966cc, edge: 0xd9bfe8 },   // amethyst
        { fill: 0x0f52ba, edge: 0x8ec3ec },   // sapphire
        { fill: 0x0b3d8c, edge: 0x6fa8e8 },   // deep sapphire
        { fill: 0x1f94d2, edge: 0x9edcf0 },   // blue topaz
        { fill: 0x2ec4b6, edge: 0x9eeee6 },   // aquamarine
        { fill: 0xc9a8e0, edge: 0xf5f0eb },   // pale amethyst / pearl
      ];

      // ── spawn the gems: create 26 of them, each with a random size,
      // position, starting tilt, and its own personal drift/float speeds
      // so no two move in exactly the same way ─────────────────────────
      const gems = [];

      for (let i = 0; i < 26; i++) {
        const color   = gemColorPalette[i % gemColorPalette.length]; // cycle through the palette so colours repeat evenly
        const gemSize = 0.15 + Math.random() * 0.85; // keep them gem-sized, not building-sized
        const gemMesh = makeDiamond(THREE, color.fill, color.edge);

        gemMesh.scale.set(gemSize, gemSize, gemSize);

        gemMesh.position.set(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 36,
          (Math.random() - 0.5) * 14 - 6   // mostly positioned behind the centre of the scene
        );

        // give each gem a random starting tilt, so they don't all begin
        // facing the same direction, like diamonds tumbling in space.
        gemMesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );

        scene.add(gemMesh);

        // alongside the visible 3D shape, remember everything needed to
        // animate this particular gem every frame: how fast it spins on
        // each axis, and the details of its gentle up-and-down floating
        // motion (starting offset, speed, and how far it drifts).
        gems.push({
          mesh: gemMesh,
          spinSpeedX: (Math.random() - 0.5) * 0.006,
          spinSpeedY: (Math.random() - 0.5) * 0.009,
          spinSpeedZ: (Math.random() - 0.5) * 0.004,
          floatStartOffset: Math.random() * Math.PI * 2,
          floatSpeed:       0.18 + Math.random() * 0.42,
          floatDistance:    0.3  + Math.random() * 1.1,
          restingY: gemMesh.position.y, // the height this gem floats around, i.e. its centre point
        });
      }

      // ── mouse parallax: the camera drifts slightly toward wherever the
      // mouse is pointing, giving a subtle sense of depth as the visitor
      // moves their cursor ───────────────────────────────────────────────
      // "target" is where the camera is being pulled toward right now;
      // "current" is where the camera actually is — it eases toward the
      // target a little every frame instead of jumping straight to it, for
      // a smooth, floaty feel rather than a snappy one.
      const cameraDrift = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
      const handleMouseMove = (event) => {
        cameraDrift.targetX =  (event.clientX / window.innerWidth  - 0.5) * 7;
        cameraDrift.targetY = -(event.clientY / window.innerHeight - 0.5) * 4;
      };
      window.addEventListener("mousemove", handleMouseMove);

      // ── resize: keep the 3D scene filling the window correctly if the
      // browser window changes size ─────────────────────────────────────
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      // ── animate: redraws the scene roughly 60 times a second. each
      // frame every gem spins a little further and moves up or down along
      // a smooth wave (sine curve), and the camera eases slightly toward
      // the mouse position ────────────────────────────────────────────────
      let animationFrameId;
      let elapsedTime = 0;

      const renderNextFrame = () => {
        animationFrameId = requestAnimationFrame(renderNextFrame);
        elapsedTime += 0.016; // roughly one 60fps frame's worth of seconds

        for (const gem of gems) {
          gem.mesh.rotation.x += gem.spinSpeedX;
          gem.mesh.rotation.y += gem.spinSpeedY;
          gem.mesh.rotation.z += gem.spinSpeedZ;

          // a sine wave naturally rises and falls smoothly, which is what
          // gives each gem its gentle, endless up-and-down float.
          gem.mesh.position.y =
            gem.restingY + Math.sin(elapsedTime * gem.floatSpeed + gem.floatStartOffset) * gem.floatDistance;
        }

        // ease the camera's current position a little closer to the mouse
        // target every frame, rather than snapping straight to it.
        cameraDrift.currentX += (cameraDrift.targetX - cameraDrift.currentX) * 0.032;
        cameraDrift.currentY += (cameraDrift.targetY - cameraDrift.currentY) * 0.032;
        camera.position.x = cameraDrift.currentX;
        camera.position.y = cameraDrift.currentY;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      renderNextFrame();

      // ── cleanup: stops the animation loop and removes the event
      // listeners and canvas element once this component is no longer on
      // the page, so nothing keeps running in the background ─────────────
      cleanupScene = () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize",    handleResize);
        renderer.dispose();
        if (mountElement.contains(renderer.domElement)) {
          mountElement.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      cancelled = true;
      cleanupScene?.();
    };
  }, []);

  return <div ref={mountRef} className="gem-bg" aria-hidden="true" />;
}
