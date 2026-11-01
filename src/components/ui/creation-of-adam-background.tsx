import React, { useRef, useEffect } from 'react';

// Exact 21st.dev Parameters Specification for "The Creation of Adam"
export const ADAM_CONFIG = {
  renderMode: "dither" as const,
  bgMode: "none" as const,
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 9,
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
    vignette: { enabled: false, intensity: 38 },
    scanLines: { enabled: false, intensity: 40 },
    chromatic: { enabled: false, intensity: 15 },
    bloom: { enabled: true, intensity: 25 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: false, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 }
  },
  animated: true,
  animStyle: "pulse" as const,
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: {
    enabled: false,
    points: [] as { x: number; y: number; radius: number; intensity: number }[]
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

    const render = (timestamp: number) => {
      if (!isRunning) return;

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

      const cfg = ADAM_CONFIG;

      // 1. Clear Section to Pure Obsidian Black (#050505)
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Offscreen sampling grid at cellSize resolution
      const cols = Math.floor(targetW / cfg.cellSize);
      const rows = Math.floor(targetH / cfg.cellSize);

      if (cols <= 0 || rows <= 0) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      offscreen.width = cols;
      offscreen.height = rows;

      // Position hands across the upper 60% of the viewport (y: 8% to 58%)
      // so the bottom 40% remains completely clear for the title, subtitle, and explore button
      const imgAspect = source.naturalWidth / source.naturalHeight;
      const displayHeight = rows * 0.72;
      const displayAspect = cols / displayHeight;
      let drawW = cols;
      let drawH = displayHeight;
      let drawX = 0;
      let drawY = rows * 0.04; // upper region placement

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

      // 8. Animation: Pulse oscillation (animStyle: "pulse", speed: 100, intensity: 60)
      const speed = cfg.animSpeed.enabled ? (cfg.animSpeed.intensity / 50) : 0;
      const t = timestamp * 0.001 * speed;
      const animAmp = cfg.animIntensity.enabled ? (cfg.animIntensity.intensity / 100) : 0;
      const pulseWave = Math.sin(t * 2.2) * 0.5 + 0.5;
      const pulseMod = (pulseWave - 0.5) * animAmp * 0.25;

      ctx.globalCompositeOperation = cfg.styleBlend;
      const mouse = mousePosRef.current;

      // 3. Draw Dither Grid
      for (let y = 0; y < rows; y++) {
        const yRatio = y / rows;

        // Bottom text zone fade: fade out completely where "need amazing platforms" and subtitle live
        // Fully active in upper half, smoothly fades out between 48% and 68% height
        const textZoneFade = 1.0 - smoothstep(0.48, 0.68, yRatio);
        if (textZoneFade <= 0.01) continue;

        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3] / 255;

          if (a <= 0.05) continue;

          // Our reference image has a 100% pure black background (#000000)
          // Luminance formula: ITU-R BT.601
          const rawLum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Pure black background pixels have rawLum ~ 0.0. Skip immediately!
          if (rawLum <= 0.04) continue;

          // Contrast 158 enhancement: stretch hand details and contours
          let lum = (rawLum - 0.04) / 0.92;
          lum = Math.pow(Math.max(0, lum), 1.15) * 1.25;
          lum = Math.min(1.0, Math.max(0.0, lum));

          // Apply text-zone fade so lower pixels drop cleanly
          lum *= textZoneFade;
          if (lum <= 0.05) continue;

          // Pulse animation on the reaching fingers and muscles
          lum = Math.min(1.0, Math.max(0.0, lum + pulseMod * 0.2));

          // Interactive mouse proximity glow around the fingertips
          if (mouse) {
            const cellNormX = x / cols;
            const cellNormY = y / rows;
            const dist = Math.hypot(cellNormX - mouse.x, cellNormY - mouse.y);
            if (dist < 0.22) {
              const mouseBoost = (1 - dist / 0.22) * 0.35;
              lum = Math.min(1.0, lum + mouseBoost);
            }
          }

          // Bayer Ordered Dithering (8x8)
          const bayerThreshold = BAYER_8X8[y % 8][x % 8];
          const isDitherLit = lum > (bayerThreshold * 0.85);

          if (!isDitherLit) continue;

          // Dot sizing: between 1.5px and (cellSize - 1px)
          const px = x * cfg.cellSize;
          const py = y * cfg.cellSize;
          const dotSize = Math.max(1.5, cfg.cellSize * (0.35 + lum * 0.5));
          const cx = px + cfg.cellSize / 2;
          const cy = py + cfg.cellSize / 2;

          // Electric cyan / blue dither aesthetic (#3ca6ff) with luminous white highlights
          const dotAlpha = Math.min(0.95, (0.35 + lum * 0.6) * textZoneFade);

          if (lum > 0.72) {
            // Brightest highlights: crisp electric white-cyan (#e0f7ff)
            ctx.fillStyle = `rgba(225, 247, 255, ${dotAlpha})`;
          } else if (lum > 0.35) {
            // Midtones: signature electric blue (#3ca6ff)
            ctx.fillStyle = `rgba(60, 166, 255, ${dotAlpha * 0.9})`;
          } else {
            // Shadows: deep cyber cobalt (#1e6bb8)
            ctx.fillStyle = `rgba(30, 107, 184, ${dotAlpha * 0.75})`;
          }

          ctx.beginPath();
          ctx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Post-effects: Subtle Bloom on illuminated hands
      if (cfg.pfx.bloom.enabled && cfg.pfx.bloom.intensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (cfg.pfx.bloom.intensity / 100) * 0.3;
        ctx.filter = `blur(${Math.max(4, cfg.cellSize * 1.5)}px)`;
        ctx.drawImage(canvas, 0, 0, targetW, targetH);
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
      {/* Vignette gradients to guarantee 100% obsidian black background behind text */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none" />
    </div>
  );
}
