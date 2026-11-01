import React, { useRef, useEffect } from 'react';

// Exact 21st.dev Parameters Specification
export const ELECTRIC_GAZE_CONFIG = {
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
    vignette: { enabled: false, intensity: 38 },
    scanLines: { enabled: false, intensity: 40 },
    chromatic: { enabled: false, intensity: 15 },
    bloom: { enabled: false, intensity: 25 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: false, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 }
  },
  animated: true,
  animStyle: "shimmer" as const,
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: {
    enabled: true,
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

// 8x8 Bayer Ordered Dither Matrix
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

const CHAR_SETS = {
  standard: " .:-=+*#%@",
  dense: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  minimal: " .oO@",
  binary: " 01"
};

const MATRIX_CHARS = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890ABCDEF";

interface ElectricGazeBackgroundProps {
  className?: string;
  sourcePhoto?: string;
  opacity?: number;
}

export default function ElectricGazeBackground({
  className = "",
  sourcePhoto = "/ascii-editor/demos/generated/ref-002.webp",
  opacity = 0.85
}: ElectricGazeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const matrixStateRef = useRef<{ [col: number]: { y: number; speed: number; chars: string[] } }>({});

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourcePhoto;
    img.onload = () => {
      imageRef.current = img;
    };
    img.onerror = () => {
      // High-contrast fallback
      const fb = document.createElement("canvas");
      fb.width = 600;
      fb.height = 600;
      const fctx = fb.getContext("2d")!;
      fctx.fillStyle = "#050505";
      fctx.fillRect(0, 0, 600, 600);
      const grad = fctx.createRadialGradient(300, 300, 40, 300, 300, 280);
      grad.addColorStop(0, "#3ca6ff");
      grad.addColorStop(0.3, "#0d2b45");
      grad.addColorStop(1, "#050505");
      fctx.fillStyle = grad;
      fctx.fillRect(0, 0, 600, 600);
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

    const handleWindowMouseMove = (e: MouseEvent) => {
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

    window.addEventListener("mousemove", handleWindowMouseMove);

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

      const cfg = ELECTRIC_GAZE_CONFIG;

      // Step 1: Background Layer
      ctx.clearRect(0, 0, targetW, targetH);
      if (cfg.bgMode === "color") {
        ctx.fillStyle = cfg.tint || "#050505";
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (cfg.bgMode === "blur" || cfg.bgMode === "original") {
        ctx.save();
        ctx.globalAlpha = cfg.bgOpacity / 100;
        if (cfg.bgMode === "blur") {
          ctx.filter = `blur(${cfg.bgBlur}px)`;
        }
        ctx.drawImage(source, 0, 0, targetW, targetH);
        ctx.restore();
      }

      // Step 2: Offscreen Grid Sampling
      const cols = Math.floor(targetW / cfg.cellSize);
      const rows = Math.floor(targetH / cfg.cellSize);

      if (cols <= 0 || rows <= 0) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      offscreen.width = cols;
      offscreen.height = rows;

      // Preserve aspect ratio of source image in center
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

      // Edge Emphasis Sobel precomputation if active
      let edgeMap: Float32Array | null = null;
      if (cfg.edgeEmphasis > 0) {
        edgeMap = new Float32Array(cols * rows);
        for (let y = 1; y < rows - 1; y++) {
          for (let x = 1; x < cols - 1; x++) {
            const idx = (y * cols + x) * 4;
            const lumC = (pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114);
            const lumR = (pixels[idx+4] * 0.299 + pixels[idx+5] * 0.587 + pixels[idx+6] * 0.114);
            const lumB = (pixels[idx + cols*4] * 0.299 + pixels[idx + cols*4 + 1] * 0.587 + pixels[idx + cols*4 + 2] * 0.114);
            edgeMap[y * cols + x] = Math.min(1, (Math.abs(lumR - lumC) + Math.abs(lumB - lumC)) / 100);
          }
        }
      }

      // Step 8: Animation Parameters
      const speed = cfg.animSpeed.enabled ? (cfg.animSpeed.intensity / 50) : 0;
      const t = timestamp * 0.001 * speed;
      const animAmp = cfg.animIntensity.enabled ? (cfg.animIntensity.intensity / 100) : 0;

      // Step 4: Color Adjustments Math
      const contrastFactor = (259 * (cfg.contrast + 255)) / (255 * (259 - cfg.contrast));
      const brightOffset = cfg.brightness * 2.55;
      const satFactor = cfg.saturation / 100;
      const grayFactor = cfg.grayscale / 100;

      ctx.globalCompositeOperation = cfg.styleBlend;

      const mouse = mousePosRef.current;

      // Step 3: Draw Dither/Primitive Grid
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          let r = pixels[idx];
          let g = pixels[idx + 1];
          let b = pixels[idx + 2];
          const a = pixels[idx + 3] / 255;

          if (a <= 0.02) continue;

          // 1. Brightness
          r = Math.min(255, Math.max(0, r + brightOffset));
          g = Math.min(255, Math.max(0, g + brightOffset));
          b = Math.min(255, Math.max(0, b + brightOffset));

          // 2. Contrast
          r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));

          // 3. Saturation & Grayscale
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          r = Math.min(255, Math.max(0, lum * 255 + satFactor * (r - lum * 255)));
          g = Math.min(255, Math.max(0, lum * 255 + satFactor * (g - lum * 255)));
          b = Math.min(255, Math.max(0, lum * 255 + satFactor * (b - lum * 255)));

          if (grayFactor > 0) {
            r = r * (1 - grayFactor) + (lum * 255) * grayFactor;
            g = g * (1 - grayFactor) + (lum * 255) * grayFactor;
            b = b * (1 - grayFactor) + (lum * 255) * grayFactor;
          }

          if (cfg.invert) {
            lum = 1.0 - lum;
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }

          if (edgeMap) {
            lum = Math.min(1, lum + edgeMap[y * cols + x] * (cfg.edgeEmphasis / 50));
          }

          // Shimmer Waveform (The Electric Gaze Trademark)
          let animOffset = 0;
          if (cfg.animated && animAmp > 0) {
            const n1 = Math.sin(x * 3.7 + y * 2.1 + t * 5.0);
            const n2 = Math.cos(x * 1.3 - y * 3.4 + t * 4.2);
            animOffset = (n1 * n2) * 0.35 * animAmp;
          }

          let effLum = Math.min(1, Math.max(0, lum + animOffset));

          // Step 6: Interactive Mouse Point Light
          if (cfg.lights.enabled && mouse) {
            const mX = mouse.x * cols;
            const mY = mouse.y * rows;
            const distM = Math.hypot(x - mX, y - mY);
            const mouseRadius = cols * 0.22;
            if (distM < mouseRadius) {
              const glow = Math.pow(1 - distM / mouseRadius, 2) * 0.55;
              effLum = Math.min(1, effLum + glow);
            }
          }

          // Render Coordinates
          const cx = x * cfg.cellSize + cfg.cellSize / 2;
          const cy = y * cfg.cellSize + cfg.cellSize / 2;
          const sz = cfg.cellSize;

          // Electric Gaze Dither Output
          const bayerThreshold = BAYER_8X8[y % 8][x % 8];
          if (effLum > bayerThreshold * 0.85) {
            const dotSize = Math.max(1, sz * (cfg.density / 20) * effLum * 1.15);
            ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Step 5: Post-effects (pfx)
      // Bloom Highlight Glow Pass
      if (cfg.pfx.bloom.enabled && cfg.pfx.bloom.intensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (cfg.pfx.bloom.intensity / 100) * 0.6;
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
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, [sourcePhoto]);

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover touch-none"
        style={{ opacity }}
      />
      {/* Cinematic Vignette & Bottom Obsidian Fade to blend with homepage */}
      <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/40 to-[#050505] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
    </div>
  );
}
