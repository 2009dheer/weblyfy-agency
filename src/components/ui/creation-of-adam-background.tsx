import React, { useRef, useEffect } from 'react';

// Exact 21st.dev Parameters Specification for "The Creation of Adam"
export const ADAM_CONFIG = {
  renderMode: "dither" as const,
  bgMode: "none" as const,
  bgBlur: 12,
  bgOpacity: 90,
  cellSizeDesktop: 8,
  cellSizeMobile: 10,
  coverage: 100,
  invert: false,
  styleBlend: "source-over" as GlobalCompositeOperation,
  charSet: "standard" as const,
  customChars: "",
  brightness: 0,
  contrast: 158,
  edgeEmphasis: 0,
  density: 20,
  toneCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 }
  ],
  tint: "#3ca6ff",
  tintOpacity: 0,
  overlayBlend: "multiply" as GlobalCompositeOperation,
  saturation: 100,
  grayscale: 0,
  blurType: "off" as const,
  blurAmount: 35,
  pfx: {
    bloom: { enabled: true, intensity: 25 },
  },
  animated: true,
  animStyle: "pulse" as const,
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 }
};

// 8x8 Bayer Ordered Dither Matrix normalized to [0, 1]
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
].map(r => r.map(v => (v + 0.5) / 64));

const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

interface PrecomputedAdamPoint {
  cx: number;
  cy: number;
  normX: number;
  normY: number;
  baseLum: number;
  bayerThresh: number;
  textZoneFade: number;
}

interface CreationOfAdamBackgroundProps {
  className?: string;
  sourcePhoto?: string;
  opacity?: number;
}

export default function CreationOfAdamBackground({
  className = "",
  sourcePhoto = "/images/creation-of-adam.jpg",
  opacity = 0.85
}: CreationOfAdamBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Cached precomputed points
  const cachedDataRef = useRef<{
    width: number;
    height: number;
    cellSize: number;
    points: PrecomputedAdamPoint[];
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${sourcePhoto}?v=${Date.now()}`;
    img.onload = () => {
      imageRef.current = img;
      cachedDataRef.current = null;
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

    // Precompute active hand points ONCE on load or resize
    const precomputePoints = (targetW: number, targetH: number, cellSize: number, source: HTMLImageElement) => {
      const cols = Math.floor(targetW / cellSize);
      const rows = Math.floor(targetH / cellSize);
      if (cols <= 0 || rows <= 0) return null;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = cols;
      offCanvas.height = rows;
      const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return null;

      // Position hands across upper 70% of viewport
      const imgAspect = source.naturalWidth / source.naturalHeight;
      const displayHeight = rows * 0.72;
      const displayAspect = cols / displayHeight;
      let drawW = cols;
      let drawH = displayHeight;
      let drawX = 0;
      let drawY = rows * 0.04;

      if (imgAspect > displayAspect) {
        drawW = displayHeight * imgAspect;
        drawX = (cols - drawW) / 2;
      } else {
        drawH = cols / imgAspect;
        drawY = (displayHeight - drawH) / 2 + rows * 0.04;
      }

      offCtx.fillStyle = "#000000";
      offCtx.fillRect(0, 0, cols, rows);
      offCtx.drawImage(source, drawX, drawY, drawW, drawH);

      const imgData = offCtx.getImageData(0, 0, cols, rows);
      const pixels = imgData.data;

      const points: PrecomputedAdamPoint[] = [];

      for (let y = 0; y < rows; y++) {
        const yRatio = y / rows;
        // Text zone fade: upper half active, fades out between 48% and 68%
        const textZoneFade = 1.0 - smoothstep(0.48, 0.68, yRatio);
        if (textZoneFade <= 0.01) continue;

        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const a = pixels[idx + 3] / 255;
          if (a <= 0.05) continue;

          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const rawLum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Pure black background pixels skipped immediately
          if (rawLum <= 0.04) continue;

          // Contrast 158 enhancement
          let lum = (rawLum - 0.04) / 0.92;
          lum = Math.pow(Math.max(0, lum), 1.15) * 1.25;
          lum = Math.min(1.0, Math.max(0.0, lum));
          lum *= textZoneFade;

          if (lum <= 0.04) continue;

          const bayerThresh = BAYER_8X8[y % 8][x % 8] * 0.85;

          points.push({
            cx: x * cellSize + cellSize / 2,
            cy: y * cellSize + cellSize / 2,
            normX: x / cols,
            normY: y / rows,
            baseLum: lum,
            bayerThresh,
            textZoneFade
          });
        }
      }

      return {
        width: targetW,
        height: targetH,
        cellSize,
        points
      };
    };

    const render = (timestamp: number) => {
      if (isDisposed || !isVisible) return;

      // Throttle to 30 FPS (~33ms delta)
      if (timestamp - lastTime < 33) {
        animId = requestAnimationFrame(render);
        return;
      }
      lastTime = timestamp;

      const targetW = container.clientWidth || window.innerWidth;
      const targetH = container.clientHeight || window.innerHeight;

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
      const cellSize = isMobile ? ADAM_CONFIG.cellSizeMobile : ADAM_CONFIG.cellSizeDesktop;

      let cache = cachedDataRef.current;
      if (!cache || cache.width !== targetW || cache.height !== targetH || cache.cellSize !== cellSize) {
        cache = precomputePoints(targetW, targetH, cellSize, source);
        cachedDataRef.current = cache;
      }

      if (!cache || cache.points.length === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // 1. Clear Section to Pure Obsidian Black
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Pulse wave
      const speed = 2.0;
      const t = timestamp * 0.001 * speed;
      const pulseWave = Math.sin(t * 2.2) * 0.5 + 0.5;
      const pulseMod = (pulseWave - 0.5) * 0.12;

      const mouse = mousePosRef.current;

      // Batch all dither dots into exactly 3 paths by color tier
      const highlightPath = new Path2D();
      const midtonePath = new Path2D();
      const shadowPath = new Path2D();

      const points = cache.points;
      const totalPoints = points.length;

      for (let i = 0; i < totalPoints; i++) {
        const pt = points[i];
        let lum = pt.baseLum + pulseMod;

        // Interactive mouse glow
        if (mouse) {
          const dist = Math.hypot(pt.normX - mouse.x, pt.normY - mouse.y);
          if (dist < 0.22) {
            lum += (1 - dist / 0.22) * 0.35;
          }
        }

        if (lum <= pt.bayerThresh) continue;

        const dotRadius = Math.max(0.75, (cellSize * (0.35 + lum * 0.5)) * 0.5);
        const cx = pt.cx;
        const cy = pt.cy;

        if (lum > 0.72) {
          highlightPath.moveTo(cx + dotRadius, cy);
          highlightPath.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        } else if (lum > 0.35) {
          midtonePath.moveTo(cx + dotRadius, cy);
          midtonePath.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        } else {
          shadowPath.moveTo(cx + dotRadius, cy);
          shadowPath.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        }
      }

      // Execute exactly 3 draw calls for all dither dots!
      ctx.fillStyle = "rgba(30, 107, 184, 0.75)";
      ctx.fill(shadowPath);

      ctx.fillStyle = "rgba(60, 166, 255, 0.90)";
      ctx.fill(midtonePath);

      ctx.fillStyle = "rgba(225, 247, 255, 0.95)";
      ctx.fill(highlightPath);

      // Subtle atmospheric glow between touching fingertips (x: ~50%, y: ~30%)
      const fingertipGlow = ctx.createRadialGradient(
        targetW * 0.48, targetH * 0.32, 10,
        targetW * 0.48, targetH * 0.32, targetW * 0.25
      );
      fingertipGlow.addColorStop(0, "rgba(60, 166, 255, 0.15)");
      fingertipGlow.addColorStop(0.5, "rgba(30, 107, 184, 0.05)");
      fingertipGlow.addColorStop(1, "rgba(5, 5, 5, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = fingertipGlow;
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    // IntersectionObserver to pause rendering when offscreen
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
      cachedDataRef.current = null;
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
      {/* Vignette gradients to guarantee 100% obsidian black background behind text */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none" />
    </div>
  );
}
