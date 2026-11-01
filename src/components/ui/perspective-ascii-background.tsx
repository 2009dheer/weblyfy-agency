import React, { useRef, useEffect } from 'react';

// Exact 21st.dev Parameters Specification for "Perpective" (Perspective)
export const PERSPECTIVE_CONFIG = {
  renderMode: "mixed" as const,
  bgMode: "solid" as const,
  bgBlur: 2,
  bgOpacity: 100,
  cellSize: 3,
  coverage: 100,
  invert: false,
  styleBlend: "source-over" as GlobalCompositeOperation,
  charSet: "blocks" as const,
  customChars: "",
  brightness: 0,
  contrast: 115,
  edgeEmphasis: 49,
  density: 29,
  toneCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 0.5714285789142408, y: 0.3479472898310418 }
  ],
  tint: "#2f7d87",
  tintOpacity: 35,
  overlayBlend: "soft-light" as GlobalCompositeOperation,
  saturation: 60,
  grayscale: 20,
  blurType: "off" as const,
  blurAmount: 35,
  blurAngle: 0,
  directionalBothSides: false,
  tiltFocus: 35,
  tiltPosition: 50,
  tiltFeather: 15,
  lensFocus: 40,
  blurCenterX: 50,
  blurCenterY: 50,
  progressivePosition: 55,
  progressiveReverse: false,
  pfx: {
    vignette: { enabled: true, intensity: 55 },
    scanLines: { enabled: true, intensity: 40 },
    chromatic: { enabled: false, intensity: 4 },
    bloom: { enabled: true, intensity: 45 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: true, intensity: 4 },
    pixelate: { enabled: false, intensity: 3 },
    halftone: { enabled: false, intensity: 5 },
    filmDust: { enabled: true, intensity: 20 }
  },
  animated: true,
  animStyle: "flicker" as const,
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: {
    enabled: true,
    points: [
      {
        x: 0.7310345529139727,
        y: 0.5340715372582717,
        radius: 60,
        intensity: 80
      }
    ]
  },
  mask: {
    enabled: false,
    tool: "freehand",
    brushSize: 30,
    showOverlay: false,
    invert: false,
    dataUrl: null,
    shapes: []
  }
};

const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// Quadratic tone curve polynomial fitting (0,0), (0.5714, 0.3479), (1,1)
const evaluateToneCurve = (x: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 0.9126 * x * x + 0.0874 * x;
};

// Soft-light blend mode calculation
const softLightBlend = (base: number, tint: number): number => {
  return tint <= 0.5
    ? base - (1 - 2 * tint) * base * (1 - base)
    : base + (2 * tint - 1) * (Math.sqrt(Math.max(0, base)) - base);
};

// Fast pseudorandom hash
const hash2D = (x: number, y: number): number => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};

interface PerspectiveAsciiBackgroundProps {
  className?: string;
  sourcePhoto?: string;
  opacity?: number;
}

export default function PerspectiveAsciiBackground({
  className = "",
  sourcePhoto = "/images/perspective-subject.jpg",
  opacity = 0.85
}: PerspectiveAsciiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${sourcePhoto}?v=${Date.now()}`;
    img.onload = () => {
      imageRef.current = img;
    };
    img.onerror = () => {
      // Procedural perspective fallback if image fails to load
      const fb = document.createElement("canvas");
      fb.width = 1200;
      fb.height = 700;
      const fctx = fb.getContext("2d")!;
      fctx.fillStyle = "#050505";
      fctx.fillRect(0, 0, 1200, 700);

      // Vanishing point on the right (approx 73%, 53%)
      const vx = 1200 * 0.731;
      const vy = 700 * 0.534;

      // Draw perspective corridor grid
      fctx.strokeStyle = "rgba(47, 125, 135, 0.4)";
      fctx.lineWidth = 1.5;

      for (let x = -400; x <= 1600; x += 100) {
        fctx.beginPath();
        fctx.moveTo(x, 700);
        fctx.lineTo(vx, vy);
        fctx.stroke();

        fctx.beginPath();
        fctx.moveTo(x, 0);
        fctx.lineTo(vx, vy);
        fctx.stroke();
      }

      for (let i = 1; i <= 15; i++) {
        const factor = Math.pow(i / 15, 2.2);
        const yTop = vy - (vy - 0) * factor;
        const yBot = vy + (700 - vy) * factor;

        fctx.beginPath();
        fctx.moveTo(0, yTop);
        fctx.lineTo(1200, yTop);
        fctx.stroke();

        fctx.beginPath();
        fctx.moveTo(0, yBot);
        fctx.lineTo(1200, yBot);
        fctx.stroke();
      }

      const fallbackImg = new Image();
      fallbackImg.src = fb.toDataURL();
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
      };
    };
  }, [sourcePhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const offscreen = offscreenCanvasRef.current;
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true })!;

    let isRunning = true;
    let animId = 0;
    let glitchActive = false;
    let glitchRowStart = 0;
    let glitchRowCount = 0;
    let glitchOffset = 0;
    let frameCount = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        mousePosRef.current = { x, y };
      } else {
        mousePosRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Tint RGB for "#2f7d87":
    const tintR = 47 / 255;
    const tintG = 125 / 255;
    const tintB = 135 / 255;
    const tintOpacity = PERSPECTIVE_CONFIG.tintOpacity / 100;

    const render = (timestamp: number) => {
      if (!isRunning) return;
      frameCount++;

      const parent = canvas.parentElement;
      const targetW = parent ? parent.clientWidth : window.innerWidth;
      const targetH = parent ? parent.clientHeight : window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
        canvas.width = targetW * dpr;
        canvas.height = targetH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const source = imageRef.current;
      if (!source || !source.complete) {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      const cfg = PERSPECTIVE_CONFIG;

      // 1. Clear to solid black background (bgMode: "solid", bgOpacity: 100)
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Offscreen grid sampling at cellSize = 3px
      const cols = Math.floor(targetW / cfg.cellSize);
      const rows = Math.floor(targetH / cfg.cellSize);

      if (cols <= 0 || rows <= 0) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      offscreen.width = cols;
      offscreen.height = rows;

      // Draw source image to offscreen canvas
      const imgAspect = source.naturalWidth / source.naturalHeight;
      const screenAspect = targetW / targetH;
      let drawW = cols;
      let drawH = rows;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > screenAspect) {
        drawW = rows * imgAspect;
        drawX = (cols - drawW) / 2;
      } else {
        drawH = cols / imgAspect;
        drawY = (rows - drawH) / 2;
      }

      offCtx.fillStyle = "#000000";
      offCtx.fillRect(0, 0, cols, rows);
      offCtx.drawImage(source, drawX, drawY, drawW, drawH);

      const imgData = offCtx.getImageData(0, 0, cols, rows);
      const pixels = imgData.data;

      // 8. Animation: "flicker" style (speed: 100, intensity: 60)
      const speed = cfg.animSpeed.enabled ? (cfg.animSpeed.intensity / 50) : 0;
      const animAmp = cfg.animIntensity.enabled ? (cfg.animIntensity.intensity / 100) : 0;
      const t = timestamp * 0.001 * speed;

      // High-frequency CRT phosphor flicker noise
      const flickerNoise =
        Math.sin(t * 31.4) * 0.35 +
        Math.sin(t * 73.1) * 0.25 +
        (Math.sin(t * 149.7) > 0.85 ? 0.3 : 0);
      const flickerMod = flickerNoise * animAmp * 0.15;

      // Rare subtle glitch slice (pfx.glitch.intensity: 4)
      if (cfg.pfx.glitch.enabled) {
        if (!glitchActive && Math.random() < 0.03) {
          glitchActive = true;
          glitchRowStart = Math.floor(Math.random() * (rows - 10));
          glitchRowCount = Math.floor(Math.random() * 4) + 2;
          glitchOffset = Math.random() < 0.5 ? 2 : -2;
        } else if (glitchActive && Math.random() < 0.4) {
          glitchActive = false;
        }
      }

      // Pre-compute luminance map for edge detection (edgeEmphasis: 49)
      const lumMap = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const r = pixels[idx] / 255;
          const g = pixels[idx + 1] / 255;
          const b = pixels[idx + 2] / 255;
          lumMap[y * cols + x] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
      }

      const mouse = mousePosRef.current;
      const edgeWeight = (cfg.edgeEmphasis / 50) * 0.85;

      // 3. Render Mode: "mixed" with "blocks" charset (cellSize: 3, density: 29)
      for (let y = 0; y < rows; y++) {
        const yRatio = y / rows;

        // Text zone fade: smooth reduction where heading, subtitle & button live in lower area
        const textZoneFade = 1.0 - smoothstep(0.48, 0.70, yRatio);
        if (textZoneFade <= 0.01) continue;

        // Apply glitch horizontal offset
        const isGlitchRow = glitchActive && y >= glitchRowStart && y < glitchRowStart + glitchRowCount;
        const currentGlitchOffset = isGlitchRow ? glitchOffset : 0;

        for (let x = 0; x < cols; x++) {
          const sampleX = Math.max(0, Math.min(cols - 1, x + currentGlitchOffset));
          const idx = (y * cols + sampleX) * 4;
          let r = pixels[idx] / 255;
          let g = pixels[idx + 1] / 255;
          let b = pixels[idx + 2] / 255;
          const a = pixels[idx + 3] / 255;

          if (a <= 0.05) continue;

          // Raw luminance
          const rawLum = lumMap[y * cols + sampleX];
          if (rawLum <= 0.02) continue;

          // Edge detection (Sobel difference)
          let edge = 0;
          if (x > 0 && x < cols - 1 && y > 0 && y < rows - 1) {
            const dx = lumMap[y * cols + sampleX + 1] - lumMap[y * cols + sampleX - 1];
            const dy = lumMap[(y + 1) * cols + sampleX] - lumMap[(y - 1) * cols + sampleX];
            edge = Math.hypot(dx, dy);
          }

          // Tone curve adjustment
          let lum = evaluateToneCurve(rawLum);

          // Contrast adjustment (contrast: 115)
          lum = (lum - 0.5) * 1.35 + 0.5;
          lum = Math.max(0, Math.min(1, lum));

          // Edge emphasis boost
          lum = Math.min(1.0, lum + edge * edgeWeight);

          // Apply text zone fade
          lum *= textZoneFade;
          if (lum <= 0.04) continue;

          // Apply animation flicker
          lum = Math.max(0, Math.min(1, lum + flickerMod));

          // Density filter (density: 29) - pseudo-random dithering for low-energy cells
          const cellHash = hash2D(x, y);
          const densityThreshold = (100 - cfg.density) * 0.01;
          if (lum < 0.40 && cellHash > lum * 2.2 + (1 - densityThreshold)) {
            continue;
          }

          // Color pipeline: Grayscale (20%) -> Saturation (60%)
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = r * 0.8 + gray * 0.2;
          g = g * 0.8 + gray * 0.2;
          b = b * 0.8 + gray * 0.2;

          // Saturation 60%
          r = gray + (r - gray) * 0.6;
          g = gray + (g - gray) * 0.6;
          b = gray + (b - gray) * 0.6;

          // Tint: #2f7d87 with soft-light blend at tintOpacity 35%
          const rTinted = softLightBlend(r, tintR);
          const gTinted = softLightBlend(g, tintG);
          const bTinted = softLightBlend(b, tintB);

          r = r * (1 - tintOpacity) + rTinted * tintOpacity;
          g = g * (1 - tintOpacity) + gTinted * tintOpacity;
          b = b * (1 - tintOpacity) + bTinted * tintOpacity;

          // Brightness factor from lum
          const boost = 0.7 + lum * 0.6;
          const finalR = Math.min(255, Math.floor(r * boost * 255));
          const finalG = Math.min(255, Math.floor(g * boost * 255));
          const finalB = Math.min(255, Math.floor(b * boost * 255));
          const cellAlpha = Math.min(0.95, (0.35 + lum * 0.65) * textZoneFade);

          ctx.fillStyle = `rgba(${finalR}, ${finalG}, ${finalB}, ${cellAlpha})`;

          const px = x * cfg.cellSize;
          const py = y * cfg.cellSize;

          // "mixed" mode with "blocks" charset:
          // Low lum: 1px micro-dot
          // Mid lum: 2px half-block
          // High lum or edge: 3px solid block
          if (lum > 0.65 || edge > 0.25) {
            // Full 3x3 block
            ctx.fillRect(px, py, cfg.cellSize, cfg.cellSize);
          } else if (lum > 0.28) {
            // 2x2 micro-block centered
            ctx.fillRect(px + 0.5, py + 0.5, 2, 2);
          } else {
            // 1x1 micro-dot
            ctx.fillRect(px + 1, py + 1, 1, 1);
          }
        }
      }

      // 6. Lights: Focal Point Glow at (x: 0.731, y: 0.534, radius: 60, intensity: 80)
      if (cfg.lights.enabled && cfg.lights.points.length > 0) {
        for (const pt of cfg.lights.points) {
          // Dynamic perspective parallax on vanishing point light from mouse
          let lx = pt.x * targetW;
          let ly = pt.y * targetH;

          if (mouse) {
            lx += (mouse.x - 0.5) * targetW * 0.05;
            ly += (mouse.y - 0.5) * targetH * 0.05;
          }

          const lightRadius = Math.min(targetW, targetH) * (pt.radius / 100);
          const lightAlpha = (pt.intensity / 100) * 0.45;

          const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lightRadius);
          lightGrad.addColorStop(0, `rgba(200, 248, 255, ${lightAlpha * (1 + flickerMod * 0.5)})`);
          lightGrad.addColorStop(0.25, `rgba(47, 125, 135, ${lightAlpha * 0.7})`);
          lightGrad.addColorStop(0.65, `rgba(20, 60, 75, ${lightAlpha * 0.25})`);
          lightGrad.addColorStop(1, "rgba(5, 5, 5, 0)");

          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = lightGrad;
          ctx.beginPath();
          ctx.arc(lx, ly, lightRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Post-effects: Bloom (intensity: 45)
      if (cfg.pfx.bloom.enabled && cfg.pfx.bloom.intensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (cfg.pfx.bloom.intensity / 100) * 0.28;
        ctx.filter = `blur(${Math.max(4, cfg.cellSize * 2)}px)`;
        ctx.drawImage(canvas, 0, 0, targetW, targetH);
        ctx.restore();
      }

      // Post-effects: Scanlines (intensity: 40)
      if (cfg.pfx.scanLines.enabled && cfg.pfx.scanLines.intensity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${(cfg.pfx.scanLines.intensity / 100) * 0.22})`;
        for (let sy = 0; sy < targetH; sy += cfg.cellSize) {
          ctx.fillRect(0, sy, targetW, 1);
        }
        ctx.restore();
      }

      // Post-effects: Vignette (intensity: 55)
      if (cfg.pfx.vignette.enabled && cfg.pfx.vignette.intensity > 0) {
        const vigGrad = ctx.createRadialGradient(
          targetW * 0.55,
          targetH * 0.45,
          Math.min(targetW, targetH) * 0.25,
          targetW * 0.5,
          targetH * 0.5,
          Math.hypot(targetW, targetH) * 0.65
        );
        const vigAlpha = (cfg.pfx.vignette.intensity / 100) * 0.65;
        vigGrad.addColorStop(0, "rgba(5, 5, 5, 0)");
        vigGrad.addColorStop(0.7, `rgba(5, 5, 5, ${vigAlpha * 0.5})`);
        vigGrad.addColorStop(1, `rgba(5, 5, 5, ${vigAlpha})`);

        ctx.save();
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [sourcePhoto]);

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover touch-none"
        style={{ opacity }}
      />
      {/* Heavy bottom and top vignettes to guarantee pure black background behind typography */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none" />
    </div>
  );
}
