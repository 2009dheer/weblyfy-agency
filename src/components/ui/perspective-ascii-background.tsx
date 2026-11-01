import React, { useRef, useEffect } from 'react';

// Exact 21st.dev Parameters Specification for "Perpective" (Perspective)
export const PERSPECTIVE_CONFIG = {
  renderMode: "mixed" as const,
  bgMode: "solid" as const,
  bgBlur: 2,
  bgOpacity: 100,
  cellSizeDesktop: 6,
  cellSizeMobile: 8,
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
  pfx: {
    vignette: { enabled: true, intensity: 55 },
    scanLines: { enabled: true, intensity: 40 },
    chromatic: { enabled: false, intensity: 4 },
    bloom: { enabled: true, intensity: 45 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: true, intensity: 4 },
    pixelate: { enabled: false, intensity: 3 },
    halftone: { enabled: false, intensity: 5 },
    filmDust: { enabled: false, intensity: 20 }
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

interface PrecomputedCell {
  x: number;
  y: number;
  px: number;
  py: number;
  r: number;
  g: number;
  b: number;
  baseLum: number;
  edge: number;
  textZoneFade: number;
  type: 0 | 1 | 2; // 0 = micro-dot (1x1), 1 = micro-block (2x2), 2 = full block
  bucket: number;  // 0-7 color bucket for batch rendering
}

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Cached precomputed grid data (computed ONLY on image load or resize)
  const cachedDataRef = useRef<{
    width: number;
    height: number;
    cellSize: number;
    cells: PrecomputedCell[];
  } | null>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${sourcePhoto}?v=${Date.now()}`;
    img.onload = () => {
      imageRef.current = img;
      cachedDataRef.current = null; // Invalidate cache so next render recalculates
    };
    img.onerror = () => {
      // Procedural perspective fallback
      const fb = document.createElement("canvas");
      fb.width = 1200;
      fb.height = 700;
      const fctx = fb.getContext("2d")!;
      fctx.fillStyle = "#050505";
      fctx.fillRect(0, 0, 1200, 700);

      const vx = 1200 * 0.731;
      const vy = 700 * 0.534;

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
        cachedDataRef.current = null;
      };
    };
  }, [sourcePhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let isVisible = false;
    let isDisposed = false;
    let animId = 0;
    let lastTime = 0;
    let glitchActive = false;
    let glitchRowStart = 0;
    let glitchRowCount = 0;
    let glitchOffset = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        mousePosRef.current = { x, y };
      } else {
        mousePosRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Precompute color palette buckets (8 levels of cyan/teal glow)
    // Avoids generating thousands of string objects every single frame
    const tintR = 47 / 255;
    const tintG = 125 / 255;
    const tintB = 135 / 255;
    const tintOpacity = PERSPECTIVE_CONFIG.tintOpacity / 100;

    const BUCKET_COUNT = 8;
    const paletteStrings: string[] = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const lumLevel = (i + 0.5) / BUCKET_COUNT;
      const boost = 0.7 + lumLevel * 0.6;
      let r = 0.75 * boost;
      let g = 0.85 * boost;
      let b = 0.95 * boost;

      // Soft-light tint
      const rt = softLightBlend(r, tintR);
      const gt = softLightBlend(g, tintG);
      const bt = softLightBlend(b, tintB);
      r = r * (1 - tintOpacity) + rt * tintOpacity;
      g = g * (1 - tintOpacity) + gt * tintOpacity;
      b = b * (1 - tintOpacity) + bt * tintOpacity;

      const ir = Math.min(255, Math.floor(r * 255));
      const ig = Math.min(255, Math.floor(g * 255));
      const ib = Math.min(255, Math.floor(b * 255));
      const alpha = Math.min(0.95, 0.35 + lumLevel * 0.65);
      paletteStrings.push(`rgba(${ir}, ${ig}, ${ib}, ${alpha.toFixed(2)})`);
    }

    // Function to precompute the cell grid ONCE upon resize or image load
    const precomputeGrid = (targetW: number, targetH: number, cellSize: number, source: HTMLImageElement) => {
      const cols = Math.floor(targetW / cellSize);
      const rows = Math.floor(targetH / cellSize);
      if (cols <= 0 || rows <= 0) return null;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = cols;
      offCanvas.height = rows;
      const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return null;

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

      // Pre-compute raw luminance map
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

      const edgeWeight = (PERSPECTIVE_CONFIG.edgeEmphasis / 50) * 0.85;
      const densityThreshold = (100 - PERSPECTIVE_CONFIG.density) * 0.01;
      const cells: PrecomputedCell[] = [];

      for (let y = 0; y < rows; y++) {
        const yRatio = y / rows;
        // Text zone fade: lower area is obsidian black
        const textZoneFade = 1.0 - smoothstep(0.48, 0.70, yRatio);
        if (textZoneFade <= 0.01) continue;

        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const a = pixels[idx + 3] / 255;
          if (a <= 0.05) continue;

          const rawLum = lumMap[y * cols + x];
          if (rawLum <= 0.02) continue;

          // Sobel edge
          let edge = 0;
          if (x > 0 && x < cols - 1 && y > 0 && y < rows - 1) {
            const dx = lumMap[y * cols + x + 1] - lumMap[y * cols + x - 1];
            const dy = lumMap[(y + 1) * cols + x] - lumMap[(y - 1) * cols + x];
            edge = Math.hypot(dx, dy);
          }

          let lum = evaluateToneCurve(rawLum);
          lum = (lum - 0.5) * 1.35 + 0.5;
          lum = Math.max(0, Math.min(1, lum));
          lum = Math.min(1.0, lum + edge * edgeWeight);
          lum *= textZoneFade;

          if (lum <= 0.04) continue;

          // Density filter
          const cellHash = hash2D(x, y);
          if (lum < 0.40 && cellHash > lum * 2.2 + (1 - densityThreshold)) {
            continue;
          }

          let r = pixels[idx] / 255;
          let g = pixels[idx + 1] / 255;
          let b = pixels[idx + 2] / 255;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * 0.6;
          g = gray + (g - gray) * 0.6;
          b = gray + (b - gray) * 0.6;

          const rt = softLightBlend(r, tintR);
          const gt = softLightBlend(g, tintG);
          const bt = softLightBlend(b, tintB);
          r = r * (1 - tintOpacity) + rt * tintOpacity;
          g = g * (1 - tintOpacity) + gt * tintOpacity;
          b = b * (1 - tintOpacity) + bt * tintOpacity;

          // Cell shape type:
          // 2 = full block (high lum or edge)
          // 1 = 2x2 micro-block
          // 0 = 1x1 micro-dot
          let type: 0 | 1 | 2 = 0;
          if (lum > 0.65 || edge > 0.25) {
            type = 2;
          } else if (lum > 0.28) {
            type = 1;
          }

          const bucket = Math.max(0, Math.min(BUCKET_COUNT - 1, Math.floor(lum * BUCKET_COUNT)));

          cells.push({
            x,
            y,
            px: x * cellSize,
            py: y * cellSize,
            r,
            g,
            b,
            baseLum: lum,
            edge,
            textZoneFade,
            type,
            bucket
          });
        }
      }

      return {
        width: targetW,
        height: targetH,
        cellSize,
        cells
      };
    };

    const render = (timestamp: number) => {
      if (isDisposed || !isVisible) return;

      // Throttle to 30 FPS (~33ms delta) to eliminate CPU/GPU drain
      if (timestamp - lastTime < 33) {
        animId = requestAnimationFrame(render);
        return;
      }
      lastTime = timestamp;

      const targetW = container.clientWidth || window.innerWidth;
      const targetH = container.clientHeight || window.innerHeight;

      // Keep dpr at 1 for retro ASCII grid; eliminates 4x-9x pixel scaling penalty on retina/mobile
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const source = imageRef.current;
      if (!source || !source.complete) {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, targetW, targetH);
        animId = requestAnimationFrame(render);
        return;
      }

      const isMobile = targetW < 768;
      const cellSize = isMobile ? PERSPECTIVE_CONFIG.cellSizeMobile : PERSPECTIVE_CONFIG.cellSizeDesktop;

      // Check if cache needs recalculation
      let cache = cachedDataRef.current;
      if (!cache || cache.width !== targetW || cache.height !== targetH || cache.cellSize !== cellSize) {
        cache = precomputeGrid(targetW, targetH, cellSize, source);
        cachedDataRef.current = cache;
      }

      if (!cache || cache.cells.length === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // 1. Clear to obsidian black
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Animation flicker & occasional subtle glitch
      const speed = 2.0;
      const t = timestamp * 0.001 * speed;
      const flickerNoise =
        Math.sin(t * 31.4) * 0.35 +
        Math.sin(t * 73.1) * 0.25 +
        (Math.sin(t * 149.7) > 0.85 ? 0.3 : 0);
      const flickerMod = flickerNoise * 0.09;

      if (PERSPECTIVE_CONFIG.pfx.glitch.enabled) {
        if (!glitchActive && Math.random() < 0.02) {
          glitchActive = true;
          const rows = Math.floor(targetH / cellSize);
          glitchRowStart = Math.floor(Math.random() * (rows - 10));
          glitchRowCount = Math.floor(Math.random() * 4) + 2;
          glitchOffset = (Math.random() < 0.5 ? 3 : -3) * cellSize;
        } else if (glitchActive && Math.random() < 0.4) {
          glitchActive = false;
        }
      }

      // Group draw calls into bucket paths to achieve maximum canvas performance (0.5ms draw time)
      const bucketPaths: Path2D[] = Array.from({ length: BUCKET_COUNT }, () => new Path2D());
      const cells = cache.cells;
      const totalCells = cells.length;

      for (let i = 0; i < totalCells; i++) {
        const cell = cells[i];

        let px = cell.px;
        const py = cell.py;

        if (glitchActive && cell.y >= glitchRowStart && cell.y < glitchRowStart + glitchRowCount) {
          px += glitchOffset;
        }

        // Apply time-based flicker to bucket selection
        let dynamicBucket = cell.bucket;
        if (flickerMod > 0.03 && dynamicBucket < BUCKET_COUNT - 1) {
          dynamicBucket++;
        } else if (flickerMod < -0.03 && dynamicBucket > 0) {
          dynamicBucket--;
        }

        const path = bucketPaths[dynamicBucket];

        if (cell.type === 2) {
          // Full block
          path.rect(px, py, cellSize - 0.5, cellSize - 0.5);
        } else if (cell.type === 1) {
          // 2x2 micro-block
          path.rect(px + 1, py + 1, cellSize * 0.5, cellSize * 0.5);
        } else {
          // 1x1 micro-dot
          path.rect(px + 1.5, py + 1.5, 1.5, 1.5);
        }
      }

      // Execute exactly 8 draw calls for the entire grid!
      for (let b = 0; b < BUCKET_COUNT; b++) {
        ctx.fillStyle = paletteStrings[b];
        ctx.fill(bucketPaths[b]);
      }

      // 3. Focal Point Glow at vanishing point (x: 0.731, y: 0.534)
      const mouse = mousePosRef.current;
      let lx = 0.731 * targetW;
      let ly = 0.534 * targetH;
      if (mouse) {
        lx += (mouse.x - 0.5) * targetW * 0.04;
        ly += (mouse.y - 0.5) * targetH * 0.04;
      }

      const lightRadius = Math.min(targetW, targetH) * 0.55;
      const lightGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lightRadius);
      const lightAlpha = 0.42 * (1 + flickerMod * 0.4);
      lightGrad.addColorStop(0, `rgba(200, 248, 255, ${lightAlpha})`);
      lightGrad.addColorStop(0.25, `rgba(47, 125, 135, ${lightAlpha * 0.65})`);
      lightGrad.addColorStop(0.65, `rgba(20, 60, 75, ${lightAlpha * 0.2})`);
      lightGrad.addColorStop(1, "rgba(5, 5, 5, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Subtle Vignette
      const vigGrad = ctx.createRadialGradient(
        targetW * 0.55,
        targetH * 0.45,
        Math.min(targetW, targetH) * 0.25,
        targetW * 0.5,
        targetH * 0.5,
        Math.hypot(targetW, targetH) * 0.65
      );
      vigGrad.addColorStop(0, "rgba(5, 5, 5, 0)");
      vigGrad.addColorStop(0.7, "rgba(5, 5, 5, 0.35)");
      vigGrad.addColorStop(1, "rgba(5, 5, 5, 0.75)");

      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, targetW, targetH);

      animId = requestAnimationFrame(render);
    };

    // IntersectionObserver to sleep rendering completely when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            lastTime = performance.now();
            animId = requestAnimationFrame(render);
          }
        } else {
          isVisible = false;
          cancelAnimationFrame(animId);
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(container);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!isVisible && container) {
          const rect = container.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            isVisible = true;
            animId = requestAnimationFrame(render);
          }
        }
      } else {
        isVisible = false;
        cancelAnimationFrame(animId);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const onResize = () => {
      cachedDataRef.current = null; // Forces recalculation on next visible frame
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      isDisposed = true;
      isVisible = false;
      cancelAnimationFrame(animId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [sourcePhoto]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover touch-none"
        style={{ opacity }}
      />
      {/* Zero-cost GPU hardware scanlines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.4) 3px, rgba(0, 0, 0, 0.4) 6px)"
        }}
      />
      {/* Heavy bottom and top vignettes to guarantee pure black background behind typography */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none" />
    </div>
  );
}
