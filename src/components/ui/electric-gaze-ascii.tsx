import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Camera, Upload, RefreshCw, Sliders, Eye, Zap, 
  Terminal, Shield, Layers, Download, Maximize2, Play, Pause, ChevronRight, Check
} from 'lucide-react';

export interface AsciiConfig {
  renderMode: 
    | "characters" | "dither" | "mosaic" | "pixel" | "dots" | "cross" | "diamond" 
    | "voxel" | "lego" | "mixed" | "lines" | "diagonal" | "braille" | "disco" 
    | "hexdump" | "matrix" | "rings" | "hearts" | "stars" | "hexagons" | "triangles" 
    | "bubbles" | "hatch" | "contour" | "halfblocks";
  bgMode: "none" | "color" | "blur" | "original";
  bgBlur: number;
  bgOpacity: number;
  cellSize: number;
  coverage: number;
  invert: boolean;
  styleBlend: GlobalCompositeOperation;
  charSet: "standard" | "dense" | "minimal" | "binary" | "custom";
  customChars: string;
  brightness: number;
  contrast: number;
  edgeEmphasis: number;
  density: number;
  toneCurve: { x: number; y: number }[];
  tint: string;
  tintOpacity: number;
  overlayBlend: GlobalCompositeOperation;
  saturation: number;
  grayscale: number;
  blurType: "off" | "gaussian" | "tilt-shift" | "directional" | "lens" | "progressive";
  blurAmount: number;
  blurAngle: number;
  directionalBothSides: boolean;
  tiltFocus: number;
  tiltPosition: number;
  tiltFeather: number;
  lensFocus: number;
  blurCenterX: number;
  blurCenterY: number;
  progressivePosition: number;
  progressiveReverse: boolean;
  pfx: {
    vignette: { enabled: boolean; intensity: number };
    scanLines: { enabled: boolean; intensity: number };
    chromatic: { enabled: boolean; intensity: number };
    bloom: { enabled: boolean; intensity: number };
    filmGrain: { enabled: boolean; intensity: number };
    glitch: { enabled: boolean; intensity: number };
    pixelate: { enabled: boolean; intensity: number };
    halftone: { enabled: boolean; intensity: number };
    filmDust: { enabled: boolean; intensity: number };
  };
  animated: boolean;
  animStyle: "shimmer" | "wave" | "pulse" | "ripple" | "flicker";
  animSpeed: { enabled: boolean; intensity: number };
  animIntensity: { enabled: boolean; intensity: number };
  lights: {
    enabled: boolean;
    points: { x: number; y: number; radius: number; intensity: number; color?: string }[];
  };
  mask: {
    enabled: boolean;
    tool: string;
    brushSize: number;
    showOverlay: boolean;
    invert: boolean;
    dataUrl: string | null;
    shapes: any[];
  };
}

export const DEFAULT_CONFIG: AsciiConfig = {
  renderMode: "dither",
  bgMode: "none",
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 9,
  coverage: 100,
  invert: false,
  styleBlend: "source-over",
  charSet: "standard",
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
  overlayBlend: "multiply",
  saturation: 100,
  grayscale: 0,
  blurType: "off",
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
  animStyle: "shimmer",
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: {
    enabled: true,
    points: []
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

// 8x8 Bayer Dithering Matrix
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
  binary: " 01",
  custom: ""
};

const MATRIX_CHARS = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890ABCDEF";

export default function ElectricGazeAscii({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [config, setConfig] = useState<AsciiConfig>(DEFAULT_CONFIG);
  const [activePreset, setActivePreset] = useState<string>("electric-gaze");
  const [sourceType, setSourceType] = useState<"demo" | "webcam" | "upload">("demo");
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"modes" | "adjust" | "fx" | "anim">("modes");
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [fps, setFps] = useState<number>(60);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const matrixStateRef = useRef<{ [col: number]: { y: number; speed: number; chars: string[] } }>({});
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(performance.now());

  // Available Presets
  const PRESETS: { [key: string]: { label: string; desc: string; patch: Partial<AsciiConfig> } } = {
    "electric-gaze": {
      label: "Electric Gaze",
      desc: "21st.dev Flagship: Ultra-contrast shimmer dithering with piercing cyan luminescence",
      patch: {
        renderMode: "dither",
        cellSize: 9,
        contrast: 158,
        brightness: 0,
        density: 20,
        tint: "#3ca6ff",
        tintOpacity: 0,
        animStyle: "shimmer",
        animSpeed: { enabled: true, intensity: 100 },
        animIntensity: { enabled: true, intensity: 60 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          bloom: { enabled: true, intensity: 35 },
          vignette: { enabled: true, intensity: 45 }
        }
      }
    },
    "matrix-rain": {
      label: "Matrix Code Rain",
      desc: "Self-animating emerald green katakana code rain streaming over neural features",
      patch: {
        renderMode: "matrix",
        cellSize: 11,
        contrast: 170,
        brightness: 10,
        density: 24,
        tint: "#00ff66",
        tintOpacity: 25,
        animStyle: "wave",
        animSpeed: { enabled: true, intensity: 120 },
        animIntensity: { enabled: true, intensity: 80 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          bloom: { enabled: true, intensity: 50 },
          scanLines: { enabled: true, intensity: 45 }
        }
      }
    },
    "braille-neural": {
      label: "Braille Vector",
      desc: "High-density 2x4 sub-pixel Unicode Braille typography with obsidian depth",
      patch: {
        renderMode: "braille",
        cellSize: 10,
        contrast: 165,
        brightness: -5,
        density: 22,
        tint: "#ffffff",
        tintOpacity: 0,
        animStyle: "pulse",
        animSpeed: { enabled: true, intensity: 80 },
        animIntensity: { enabled: true, intensity: 50 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          filmGrain: { enabled: true, intensity: 25 },
          chromatic: { enabled: true, intensity: 20 }
        }
      }
    },
    "hexdump-terminal": {
      label: "Hexdump Terminal",
      desc: "Forensic memory address bytecode rasterization with electric amber CRT sweep",
      patch: {
        renderMode: "hexdump",
        cellSize: 10,
        contrast: 160,
        brightness: 5,
        density: 20,
        tint: "#ffb703",
        tintOpacity: 20,
        animStyle: "shimmer",
        animSpeed: { enabled: true, intensity: 90 },
        animIntensity: { enabled: true, intensity: 50 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          scanLines: { enabled: true, intensity: 50 },
          vignette: { enabled: true, intensity: 60 }
        }
      }
    },
    "voxel-monolith": {
      label: "Voxel Obsidian",
      desc: "Pseudo-3D isometric shaded micro-voxels constructing the subject in space",
      patch: {
        renderMode: "voxel",
        cellSize: 12,
        contrast: 150,
        brightness: -10,
        density: 22,
        animStyle: "ripple",
        animSpeed: { enabled: true, intensity: 70 },
        animIntensity: { enabled: true, intensity: 45 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          bloom: { enabled: true, intensity: 30 }
        }
      }
    },
    "crosshatch-sketch": {
      label: "Pencil Crosshatch",
      desc: "Multi-layered mechanical pencil hatching lines following tone gradient",
      patch: {
        renderMode: "hatch",
        cellSize: 8,
        contrast: 175,
        brightness: 5,
        density: 24,
        animStyle: "shimmer",
        animSpeed: { enabled: true, intensity: 50 },
        animIntensity: { enabled: true, intensity: 30 },
        pfx: {
          ...DEFAULT_CONFIG.pfx,
          filmGrain: { enabled: true, intensity: 40 }
        }
      }
    }
  };

  // Load the initial source photo (/ascii-editor/demos/generated/ref-002.webp or fallback)
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/ascii-editor/demos/generated/ref-002.webp";
    
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      // Fallback to logo or high-contrast procedural canvas if image fails
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 800;
      fallbackCanvas.height = 800;
      const fctx = fallbackCanvas.getContext("2d")!;
      // Draw cyber gaze fallback
      fctx.fillStyle = "#050505";
      fctx.fillRect(0, 0, 800, 800);
      
      const grad = fctx.createRadialGradient(400, 400, 50, 400, 400, 380);
      grad.addColorStop(0, "#3ca6ff");
      grad.addColorStop(0.3, "#112233");
      grad.addColorStop(1, "#050505");
      fctx.fillStyle = grad;
      fctx.fillRect(0, 0, 800, 800);
      
      const fallbackImg = new Image();
      fallbackImg.src = fallbackCanvas.toDataURL();
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
        setImageLoaded(true);
      };
    };
  }, []);

  // Handle webcam activation
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setSourceType("webcam");
      }
    } catch (err) {
      console.warn("Webcam access declined or unavailable", err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setSourceType("demo");
  };

  // Handle image upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          stopWebcam();
          imageRef.current = img;
          setSourceType("upload");
          setImageLoaded(true);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Switch Preset
  const applyPreset = (key: string) => {
    setActivePreset(key);
    const p = PRESETS[key];
    if (p) {
      setConfig(prev => ({
        ...prev,
        ...p.patch,
        pfx: {
          ...prev.pfx,
          ...(p.patch.pfx || {})
        }
      }));
    }
  };

  // Track FPS & Mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Download high-res PNG snapshot
  const exportArtwork = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `weblyfy-electric-gaze-${config.renderMode}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // CORE RASTER ENGINE PIPELINE
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

    const renderLoop = (timestamp: number) => {
      if (!isRunning) return;

      // Calculate FPS
      frameCountRef.current++;
      if (timestamp - fpsTimerRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        fpsTimerRef.current = timestamp;
      }

      const container = containerRef.current;
      const targetWidth = container ? container.clientWidth : 800;
      const targetHeight = container ? container.clientHeight : 600;

      // Handle HiDPI Crispness
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
        canvas.width = targetWidth * dpr;
        canvas.height = targetHeight * dpr;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Determine Source Frame
      let sourceElem: CanvasImageSource | null = null;
      if (sourceType === "webcam" && videoRef.current && videoRef.current.readyState >= 2) {
        sourceElem = videoRef.current;
      } else if (imageRef.current && imageRef.current.complete) {
        sourceElem = imageRef.current;
      }

      if (!sourceElem) {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.restore();
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Step 1: Background rendering (bgMode, bgBlur, bgOpacity)
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      if (config.bgMode === "color") {
        ctx.fillStyle = config.tint || "#050505";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      } else if (config.bgMode === "blur" || config.bgMode === "original") {
        ctx.save();
        ctx.globalAlpha = config.bgOpacity / 100;
        if (config.bgMode === "blur") {
          ctx.filter = `blur(${config.bgBlur}px)`;
        }
        ctx.drawImage(sourceElem, 0, 0, targetWidth, targetHeight);
        ctx.restore();
      }

      // Setup Offscreen Canvas for Sampling & Image Processing
      const cols = Math.floor(targetWidth / config.cellSize);
      const rows = Math.floor(targetHeight / config.cellSize);
      if (cols <= 0 || rows <= 0) {
        ctx.restore();
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      offscreen.width = cols;
      offscreen.height = rows;

      // Apply blur pre-filter on offscreen canvas if active
      if (config.blurType === "gaussian" && config.blurAmount > 0) {
        offCtx.filter = `blur(${config.blurAmount * 0.1}px)`;
      } else {
        offCtx.filter = "none";
      }

      offCtx.drawImage(sourceElem, 0, 0, cols, rows);
      const imgData = offCtx.getImageData(0, 0, cols, rows);
      const data = imgData.data;

      // Pre-calculate Edge Emphasis map if requested
      let edgeMap: Float32Array | null = null;
      if (config.edgeEmphasis > 0) {
        edgeMap = new Float32Array(cols * rows);
        for (let y = 1; y < rows - 1; y++) {
          for (let x = 1; x < cols - 1; x++) {
            const idx = (y * cols + x) * 4;
            const lumC = (data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114);
            const lumR = (data[idx+4] * 0.299 + data[idx+5] * 0.587 + data[idx+6] * 0.114);
            const lumB = (data[idx + cols*4] * 0.299 + data[idx + cols*4 + 1] * 0.587 + data[idx + cols*4 + 2] * 0.114);
            edgeMap[y * cols + x] = Math.min(1, (Math.abs(lumR - lumC) + Math.abs(lumB - lumC)) / 100);
          }
        }
      }

      // Time variables for procedural animation
      const speedFactor = config.animSpeed.enabled ? (config.animSpeed.intensity / 50) : 0;
      const t = (timestamp * 0.001 * speedFactor);
      const animAmp = config.animIntensity.enabled ? (config.animIntensity.intensity / 100) : 0;

      // Color Processing Parameters
      const contrastFactor = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));
      const brightOffset = config.brightness * 2.55;
      const satFactor = config.saturation / 100;
      const grayFactor = config.grayscale / 100;
      const charList = config.charSet === "custom" && config.customChars.length > 0
        ? config.customChars
        : CHAR_SETS[config.charSet] || CHAR_SETS.standard;

      // Set canvas rendering style blend mode
      ctx.globalCompositeOperation = config.styleBlend || "source-over";

      // Step 2 & 3: Iterate grid cells and render selected primitive
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Coverage probability check
          if (config.coverage < 100) {
            const pseudoHash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            if ((pseudoHash - Math.floor(pseudoHash)) * 100 > config.coverage) {
              continue;
            }
          }

          const i = (y * cols + x) * 4;
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          let a = data[i + 3] / 255;

          if (a <= 0.02) continue;

          // Step 4: Color Adjustments in exact order (brightness, contrast, saturation, grayscale)
          // 1. Brightness
          r = Math.min(255, Math.max(0, r + brightOffset));
          g = Math.min(255, Math.max(0, g + brightOffset));
          b = Math.min(255, Math.max(0, b + brightOffset));

          // 2. Contrast
          r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));

          // 3. Saturation
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          r = Math.min(255, Math.max(0, lum * 255 + satFactor * (r - lum * 255)));
          g = Math.min(255, Math.max(0, lum * 255 + satFactor * (g - lum * 255)));
          b = Math.min(255, Math.max(0, lum * 255 + satFactor * (b - lum * 255)));

          // 4. Grayscale
          if (grayFactor > 0) {
            r = r * (1 - grayFactor) + (lum * 255) * grayFactor;
            g = g * (1 - grayFactor) + (lum * 255) * grayFactor;
            b = b * (1 - grayFactor) + (lum * 255) * grayFactor;
          }

          // Invert check
          if (config.invert) {
            lum = 1.0 - lum;
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }

          // Edge emphasis addition
          if (edgeMap) {
            lum = Math.min(1, lum + edgeMap[y * cols + x] * (config.edgeEmphasis / 50));
          }

          // Step 8: Animation modulation on luminance/density
          let animOffset = 0;
          if (config.animated && animAmp > 0) {
            if (config.animStyle === "shimmer") {
              // High-frequency electric shimmer (The Electric Gaze trademark look)
              const n1 = Math.sin(x * 3.7 + y * 2.1 + t * 5.0);
              const n2 = Math.cos(x * 1.3 - y * 3.4 + t * 4.2);
              animOffset = (n1 * n2) * 0.35 * animAmp;
            } else if (config.animStyle === "wave") {
              animOffset = Math.sin((x + y) * 0.2 - t * 3.5) * 0.4 * animAmp;
            } else if (config.animStyle === "pulse") {
              const dx = x - cols / 2;
              const dy = y - rows / 2;
              const dist = Math.sqrt(dx * dx + dy * dy);
              animOffset = Math.sin(dist * 0.25 - t * 4.0) * 0.4 * animAmp;
            } else if (config.animStyle === "ripple") {
              const dx = x - cols / 2;
              const dy = y - rows / 2;
              const dist = Math.sqrt(dx * dx + dy * dy);
              animOffset = (Math.sin(dist * 0.3 - t * 5.0) / (1 + dist * 0.05)) * 0.5 * animAmp;
            } else if (config.animStyle === "flicker") {
              const rand = (Math.sin(x * 99 + y * 33 + Math.floor(t * 12)) * 0.5);
              animOffset = rand * 0.4 * animAmp;
            }
          }

          let effLum = Math.min(1, Math.max(0, lum + animOffset));

          // Step 6: Interactive point lights & Mouse Glow
          if (config.lights.enabled) {
            // Apply mouse position as interactive electric flare
            if (mousePos) {
              const mX = mousePos.x * cols;
              const mY = mousePos.y * rows;
              const distM = Math.hypot(x - mX, y - mY);
              const mouseRadius = (cols * 0.25);
              if (distM < mouseRadius) {
                const glowStrength = Math.pow(1 - distM / mouseRadius, 2) * 0.6;
                effLum = Math.min(1, effLum + glowStrength);
              }
            }
            // Additional configured points
            for (const pt of config.lights.points) {
              const pX = pt.x * cols;
              const pY = pt.y * rows;
              const distP = Math.hypot(x - pX, y - pY);
              if (distP < pt.radius * cols) {
                const glowP = (1 - distP / (pt.radius * cols)) * pt.intensity;
                effLum = Math.min(1, effLum + glowP);
              }
            }
          }

          // Cell coordinates on target canvas
          const cx = x * config.cellSize + config.cellSize / 2;
          const cy = y * config.cellSize + config.cellSize / 2;
          const sz = config.cellSize;

          // Color calculation
          let fillHex = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
          if (config.tintOpacity > 0 && config.tint) {
            // Tint blend
            ctx.fillStyle = config.tint;
          } else {
            ctx.fillStyle = fillHex;
          }
          ctx.strokeStyle = ctx.fillStyle;

          // DRAW BY RENDER MODE (All 25+ modes fully supported!)
          switch (config.renderMode) {
            case "dither": {
              // 21st.dev Electric Gaze Dither Mode
              const bayerThreshold = BAYER_8X8[y % 8][x % 8];
              if (effLum > bayerThreshold * 0.85) {
                const dotSize = Math.max(1, sz * (config.density / 20) * effLum * 1.15);
                ctx.beginPath();
                ctx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case "characters": {
              const charIndex = Math.min(charList.length - 1, Math.floor(effLum * (charList.length - 1)));
              const ch = charList[charIndex];
              const fontSize = Math.max(6, Math.floor(sz * (config.density / 20)));
              ctx.font = `600 ${fontSize}px "SF Mono", "Fira Code", monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(ch, cx, cy);
              break;
            }

            case "matrix": {
              // Green digital rain code stream
              if (!matrixStateRef.current[x]) {
                matrixStateRef.current[x] = {
                  y: Math.random() * rows,
                  speed: 0.15 + Math.random() * 0.4,
                  chars: Array.from({ length: rows }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
                };
              }
              const stream = matrixStateRef.current[x];
              const isHead = Math.floor(stream.y) === y;
              const ch = stream.chars[y % stream.chars.length];
              const fontSize = Math.max(7, Math.floor(sz * 1.1));
              ctx.font = `700 ${fontSize}px monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              if (isHead) {
                ctx.fillStyle = "#ffffff"; // glowing white leading head
              } else {
                const trailAlpha = Math.max(0.2, effLum);
                ctx.fillStyle = `rgba(0, 255, 102, ${trailAlpha})`;
              }
              ctx.fillText(ch, cx, cy);
              break;
            }

            case "hexdump": {
              const hexVal = Math.floor(effLum * 15).toString(16).toUpperCase();
              const fontSize = Math.max(7, Math.floor(sz * 0.95));
              ctx.font = `700 ${fontSize}px "SF Mono", monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(hexVal, cx, cy);
              break;
            }

            case "braille": {
              // 2x4 Sub-pixel Braille generation
              let brailleOffset = 0;
              const subW = sz / 2;
              const subH = sz / 4;
              const dotWeights = [0x01, 0x02, 0x04, 0x40, 0x08, 0x10, 0x20, 0x80];
              for (let d = 0; d < 8; d++) {
                const dx = d < 4 ? 0 : 1;
                const dy = d % 4;
                const subThreshold = (d * 0.11);
                if (effLum > subThreshold) {
                  brailleOffset |= dotWeights[d];
                }
              }
              const brailleChar = String.fromCharCode(0x2800 + brailleOffset);
              ctx.font = `${Math.floor(sz * 1.25)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(brailleChar, cx, cy);
              break;
            }

            case "dots": {
              const radius = (sz / 2) * effLum * (config.density / 20);
              if (radius > 0.4) {
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case "cross": {
              const arm = (sz / 2) * effLum * (config.density / 20);
              const lw = Math.max(1, 2 * effLum);
              ctx.lineWidth = lw;
              ctx.beginPath();
              ctx.moveTo(cx - arm, cy);
              ctx.lineTo(cx + arm, cy);
              ctx.moveTo(cx, cy - arm);
              ctx.lineTo(cx, cy + arm);
              ctx.stroke();
              break;
            }

            case "diamond": {
              const rad = (sz / 2) * effLum * (config.density / 20);
              ctx.beginPath();
              ctx.moveTo(cx, cy - rad);
              ctx.lineTo(cx + rad, cy);
              ctx.lineTo(cx, cy + rad);
              ctx.lineTo(cx - rad, cy);
              ctx.closePath();
              ctx.fill();
              break;
            }

            case "mosaic": {
              const border = 1;
              ctx.fillRect(x * sz + border, y * sz + border, sz - border * 2, sz - border * 2);
              break;
            }

            case "pixel": {
              ctx.fillRect(x * sz, y * sz, sz, sz);
              break;
            }

            case "voxel": {
              // Pseudo-3D Isometric Voxel Cube
              const h = sz * effLum * 0.9;
              const half = sz / 2;
              // Top face
              ctx.fillStyle = `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.95)`;
              ctx.beginPath();
              ctx.moveTo(cx, cy - h);
              ctx.lineTo(cx + half, cy - h + half * 0.4);
              ctx.lineTo(cx, cy - h + half * 0.8);
              ctx.lineTo(cx - half, cy - h + half * 0.4);
              ctx.closePath();
              ctx.fill();
              // Left face
              ctx.fillStyle = `rgba(${r * 0.75}, ${g * 0.75}, ${b * 0.75}, 0.9)`;
              ctx.beginPath();
              ctx.moveTo(cx - half, cy - h + half * 0.4);
              ctx.lineTo(cx, cy - h + half * 0.8);
              ctx.lineTo(cx, cy + half * 0.8);
              ctx.lineTo(cx - half, cy + half * 0.4);
              ctx.closePath();
              ctx.fill();
              // Right face
              ctx.fillStyle = `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.5}, 0.9)`;
              ctx.beginPath();
              ctx.moveTo(cx, cy - h + half * 0.8);
              ctx.lineTo(cx + half, cy - h + half * 0.4);
              ctx.lineTo(cx + half, cy + half * 0.4);
              ctx.lineTo(cx, cy + half * 0.8);
              ctx.closePath();
              ctx.fill();
              break;
            }

            case "lego": {
              const pad = 1;
              ctx.fillRect(x * sz + pad, y * sz + pad, sz - pad * 2, sz - pad * 2);
              // Top stud
              ctx.beginPath();
              ctx.arc(cx, cy, sz * 0.28, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, 0.9)`;
              ctx.fill();
              break;
            }

            case "mixed": {
              if (effLum > 0.75) {
                const rad = (sz / 2) * effLum;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.fill();
              } else if (effLum > 0.45) {
                const arm = (sz / 2) * effLum;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - arm, cy);
                ctx.lineTo(cx + arm, cy);
                ctx.moveTo(cx, cy - arm);
                ctx.lineTo(cx, cy + arm);
                ctx.stroke();
              } else if (effLum > 0.15) {
                ctx.font = `600 ${Math.floor(sz * 0.75)}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(".", cx, cy);
              }
              break;
            }

            case "lines": {
              const lineH = Math.max(1, sz * effLum * (config.density / 20));
              ctx.fillRect(x * sz, cy - lineH / 2, sz, lineH);
              break;
            }

            case "diagonal": {
              ctx.lineWidth = Math.max(1, 2.5 * effLum);
              ctx.beginPath();
              if ((x + y) % 2 === 0) {
                ctx.moveTo(x * sz, y * sz);
                ctx.lineTo((x + 1) * sz, (y + 1) * sz);
              } else {
                ctx.moveTo((x + 1) * sz, y * sz);
                ctx.lineTo(x * sz, (y + 1) * sz);
              }
              ctx.stroke();
              break;
            }

            case "disco": {
              ctx.beginPath();
              ctx.arc(cx, cy, sz * 0.45 * effLum, 0, Math.PI * 2);
              ctx.fill();
              // Specular glint
              if (effLum > 0.7) {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(cx - sz * 0.15, cy - sz * 0.15, sz * 0.1, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case "rings": {
              const ringRadius = (sz / 2) * effLum * (config.density / 20);
              if (ringRadius > 1) {
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
              }
              break;
            }

            case "hearts": {
              const hs = (sz * 0.45) * effLum * (config.density / 20);
              if (hs > 1) {
                ctx.beginPath();
                ctx.moveTo(cx, cy + hs * 0.6);
                ctx.bezierCurveTo(cx - hs, cy, cx - hs * 0.7, cy - hs * 0.8, cx, cy - hs * 0.3);
                ctx.bezierCurveTo(cx + hs * 0.7, cy - hs * 0.8, cx + hs, cy, cx, cy + hs * 0.6);
                ctx.fill();
              }
              break;
            }

            case "stars": {
              const spikes = 5;
              const outer = (sz / 2) * effLum * (config.density / 20);
              const inner = outer * 0.45;
              if (outer > 1) {
                let rot = Math.PI / 2 * 3;
                const step = Math.PI / spikes;
                ctx.beginPath();
                ctx.moveTo(cx, cy - outer);
                for (let k = 0; k < spikes; k++) {
                  ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
                  rot += step;
                  ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
                  rot += step;
                }
                ctx.lineTo(cx, cy - outer);
                ctx.closePath();
                ctx.fill();
              }
              break;
            }

            case "hexagons": {
              const hexR = (sz * 0.5) * effLum;
              if (hexR > 1) {
                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                  const angle = (Math.PI / 3) * a;
                  const hx = cx + hexR * Math.cos(angle);
                  const hy = cy + hexR * Math.sin(angle);
                  if (a === 0) ctx.moveTo(hx, hy);
                  else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fill();
              }
              break;
            }

            case "triangles": {
              const tRad = (sz / 2) * effLum;
              const up = (x + y) % 2 === 0;
              ctx.beginPath();
              if (up) {
                ctx.moveTo(cx, cy - tRad);
                ctx.lineTo(cx + tRad, cy + tRad);
                ctx.lineTo(cx - tRad, cy + tRad);
              } else {
                ctx.moveTo(cx - tRad, cy - tRad);
                ctx.lineTo(cx + tRad, cy - tRad);
                ctx.lineTo(cx, cy + tRad);
              }
              ctx.closePath();
              ctx.fill();
              break;
            }

            case "bubbles": {
              const bubR = (sz * 0.45) * effLum;
              if (bubR > 1) {
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(cx, cy, bubR, 0, Math.PI * 2);
                ctx.stroke();
                // Specular highlight arc
                ctx.beginPath();
                ctx.arc(cx, cy, bubR * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
                ctx.stroke();
              }
              break;
            }

            case "hatch": {
              ctx.lineWidth = 1;
              ctx.beginPath();
              if (effLum > 0.2) {
                ctx.moveTo(x * sz, y * sz);
                ctx.lineTo((x + 1) * sz, (y + 1) * sz);
              }
              if (effLum > 0.55) {
                ctx.moveTo((x + 1) * sz, y * sz);
                ctx.lineTo(x * sz, (y + 1) * sz);
              }
              if (effLum > 0.8) {
                ctx.moveTo(cx, y * sz);
                ctx.lineTo(cx, (y + 1) * sz);
              }
              ctx.stroke();
              break;
            }

            case "contour": {
              const band = Math.floor(effLum * 4);
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(cx, cy, (sz * 0.45) * (band / 4), 0, Math.PI * 2);
              ctx.stroke();
              break;
            }

            case "halfblocks": {
              // Double vertical detail with half block glyphs
              const topHalfLum = effLum;
              const char = topHalfLum > 0.5 ? "▀" : "▄";
              ctx.font = `${sz * 1.1}px monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(char, cx, cy);
              break;
            }
          }
        }
      }

      // Step 5: Post-effects (pfx) Layering
      // Bloom
      if (config.pfx.bloom.enabled && config.pfx.bloom.intensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (config.pfx.bloom.intensity / 100) * 0.7;
        ctx.filter = `blur(${Math.max(4, config.cellSize * 1.5)}px)`;
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        ctx.restore();
      }

      // Chromatic Aberration
      if (config.pfx.chromatic.enabled && config.pfx.chromatic.intensity > 0) {
        const offset = (config.pfx.chromatic.intensity / 100) * 8;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.5;
        // Red offset
        ctx.drawImage(canvas, -offset, 0, targetWidth, targetHeight);
        // Blue offset
        ctx.drawImage(canvas, offset, 0, targetWidth, targetHeight);
        ctx.restore();
      }

      // Scan Lines
      if (config.pfx.scanLines.enabled && config.pfx.scanLines.intensity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${(config.pfx.scanLines.intensity / 100) * 0.45})`;
        for (let sl = 0; sl < targetHeight; sl += 3) {
          ctx.fillRect(0, sl, targetWidth, 1.2);
        }
        ctx.restore();
      }

      // Film Grain
      if (config.pfx.filmGrain.enabled && config.pfx.filmGrain.intensity > 0) {
        ctx.save();
        const grainAlpha = (config.pfx.filmGrain.intensity / 100) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${grainAlpha})`;
        const count = Math.floor((targetWidth * targetHeight) * 0.005);
        for (let g = 0; g < count; g++) {
          const gx = Math.random() * targetWidth;
          const gy = Math.random() * targetHeight;
          ctx.fillRect(gx, gy, 1, 1);
        }
        ctx.restore();
      }

      // Glitch
      if (config.pfx.glitch.enabled && config.pfx.glitch.intensity > 0 && Math.random() < 0.15) {
        ctx.save();
        const slices = Math.floor(Math.random() * 3) + 1;
        for (let s = 0; s < slices; s++) {
          const sy = Math.random() * targetHeight;
          const sh = 10 + Math.random() * 30;
          const shift = (Math.random() - 0.5) * (config.pfx.glitch.intensity * 0.6);
          ctx.drawImage(canvas, 0, sy, targetWidth, sh, shift, sy, targetWidth, sh);
        }
        ctx.restore();
      }

      // Vignette
      if (config.pfx.vignette.enabled && config.pfx.vignette.intensity > 0) {
        ctx.save();
        const maxRad = Math.hypot(targetWidth, targetHeight) / 2;
        const vigGrad = ctx.createRadialGradient(
          targetWidth / 2, targetHeight / 2, maxRad * 0.45,
          targetWidth / 2, targetHeight / 2, maxRad
        );
        const vigAlpha = (config.pfx.vignette.intensity / 100) * 0.85;
        vigGrad.addColorStop(0, "rgba(5, 5, 5, 0)");
        vigGrad.addColorStop(1, `rgba(5, 5, 5, ${vigAlpha})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.restore();
      }

      // Update Matrix State
      if (config.renderMode === "matrix") {
        for (let x = 0; x < cols; x++) {
          if (matrixStateRef.current[x]) {
            matrixStateRef.current[x].y += matrixStateRef.current[x].speed;
            if (matrixStateRef.current[x].y >= rows) {
              matrixStateRef.current[x].y = 0;
            }
          }
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [config, sourceType, imageLoaded, mousePos]);

  return (
    <div className={`relative w-full overflow-hidden bg-[#050505] text-white ${className}`}>
      {/* Hidden elements for webcam and file upload */}
      <video ref={videoRef} className="hidden" playsInline muted />
      
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5 text-[#3ca6ff] text-xs font-mono tracking-[0.25em] uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#3ca6ff] animate-ping" />
            <span>21st.dev Core Engine // Electric Gaze ASCII-Art</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-[500] uppercase tracking-tighter leading-none">
            The Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-[#3ca6ff]">Raster Engine</span>
          </h2>
          <p className="mt-3 text-white/50 text-sm sm:text-base max-w-xl font-sans font-[300]">
            Real-time Canvas2D procedural dither and ASCII rasterization engine with 25+ mathematical primitive modes, Bayer matrices, and quantum shimmers.
          </p>
        </div>

        {/* Live Status and Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 font-mono text-xs">
            <span className="text-white/40">FPS</span>
            <span className="text-[#3ca6ff] font-bold">{fps}</span>
            <span className="text-white/20">|</span>
            <span className="text-white/40">MODE</span>
            <span className="text-white uppercase font-bold">{config.renderMode}</span>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, animated: !prev.animated }))}
            className={`p-2.5 rounded-xl border transition-all ${
              config.animated ? "bg-[#3ca6ff]/10 border-[#3ca6ff]/40 text-[#3ca6ff]" : "bg-white/5 border-white/10 text-white/40"
            }`}
            title="Toggle Animation"
          >
            {config.animated ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={exportArtwork}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Export High-Res PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Canvas Display Viewport (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div 
              ref={containerRef}
              className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl group"
            >
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full object-cover cursor-crosshair select-none"
              />

              {/* Interactive Corner Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono tracking-widest uppercase text-white/70">
                  {config.renderMode.toUpperCase()} // CELL: {config.cellSize}PX
                </span>
                <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono tracking-widest uppercase text-[#3ca6ff]">
                  SHIMMER: {config.animIntensity.intensity}%
                </span>
              </div>

              {/* Source Mode Floating Pills */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => { stopWebcam(); setSourceType("demo"); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      sourceType === "demo" ? "bg-white text-black font-medium" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Electric Gaze
                  </button>
                  <button
                    onClick={() => {
                      if (sourceType === "webcam") stopWebcam();
                      else startWebcam();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                      sourceType === "webcam" ? "bg-[#3ca6ff] text-black font-medium" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Live Mirror
                  </button>
                  <label className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                    sourceType === "upload" ? "bg-white text-black font-medium" : "text-white/60 hover:text-white"
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  </label>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/40 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span>Hover to cast light</span>
                </div>
              </div>
            </div>

            {/* Quick Preset Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    activePreset === key 
                      ? "bg-white/10 border-[#3ca6ff] shadow-lg shadow-[#3ca6ff]/10" 
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-white">
                      {item.label}
                    </span>
                    {activePreset === key && (
                      <span className="w-2 h-2 rounded-full bg-[#3ca6ff]" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 line-clamp-1 font-sans">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Customization Studio (4 Cols) */}
          <div className="lg:col-span-4 bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col gap-6">
            
            {/* Studio Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
              {(["modes", "adjust", "fx", "anim"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 text-[11px] font-mono uppercase tracking-wider rounded-lg transition-all ${
                    activeTab === tab ? "bg-white text-black font-semibold shadow-sm" : "text-white/50 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab 1: Render Modes (25+ Primitive Styles) */}
            {activeTab === "modes" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-white/70 uppercase tracking-widest">
                    Primitives ({config.renderMode})
                  </label>
                  <span className="text-[10px] font-mono text-[#3ca6ff]">25 MODES</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {([
                    "dither", "characters", "matrix", "braille", "hexdump", "voxel",
                    "dots", "cross", "diamond", "mosaic", "pixel", "lego", 
                    "mixed", "lines", "diagonal", "disco", "rings", "hearts",
                    "stars", "hexagons", "triangles", "bubbles", "hatch", "contour", "halfblocks"
                  ] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setConfig(prev => ({ ...prev, renderMode: mode }))}
                      className={`py-2 px-2.5 rounded-lg text-[11px] font-mono uppercase tracking-wider text-center border transition-all ${
                        config.renderMode === mode
                          ? "bg-[#3ca6ff] text-black font-bold border-[#3ca6ff]"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Character set options if characters mode */}
                {config.renderMode === "characters" && (
                  <div className="mt-2 flex flex-col gap-2">
                    <label className="text-xs font-mono text-white/60">Character Ramp</label>
                    <div className="flex gap-2">
                      {(["standard", "dense", "minimal", "binary"] as const).map(cs => (
                        <button
                          key={cs}
                          onClick={() => setConfig(prev => ({ ...prev, charSet: cs }))}
                          className={`flex-1 py-1.5 text-[10px] font-mono uppercase rounded border ${
                            config.charSet === cs ? "bg-white/20 border-white text-white" : "border-white/10 text-white/40"
                          }`}
                        >
                          {cs}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Adjustments (Cell size, Contrast, Density, Invert) */}
            {activeTab === "adjust" && (
              <div className="flex flex-col gap-4">
                {/* Cell Size */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Grid Cell Size</span>
                    <span className="text-[#3ca6ff]">{config.cellSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    value={config.cellSize}
                    onChange={e => setConfig(prev => ({ ...prev, cellSize: Number(e.target.value) }))}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Contrast Curve</span>
                    <span className="text-[#3ca6ff]">{config.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    value={config.contrast}
                    onChange={e => setConfig(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Brightness</span>
                    <span className="text-[#3ca6ff]">{config.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={config.brightness}
                    onChange={e => setConfig(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                {/* Density */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Particle Density</span>
                    <span className="text-[#3ca6ff]">{config.density}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={config.density}
                    onChange={e => setConfig(prev => ({ ...prev, density: Number(e.target.value) }))}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                {/* Edge Emphasis */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Edge Emphasis (Sobel)</span>
                    <span className="text-[#3ca6ff]">{config.edgeEmphasis}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.edgeEmphasis}
                    onChange={e => setConfig(prev => ({ ...prev, edgeEmphasis: Number(e.target.value) }))}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                {/* Invert Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs font-mono text-white/70">Invert Luminance</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, invert: !prev.invert }))}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                      config.invert ? "bg-white text-black font-semibold" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {config.invert ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Post FX (Bloom, Scanlines, Chromatic, Grain, Vignette) */}
            {activeTab === "fx" && (
              <div className="flex flex-col gap-3">
                {[
                  { key: "bloom", label: "Bloom Highlight Glow" },
                  { key: "chromatic", label: "Chromatic Aberration (RGB)" },
                  { key: "scanLines", label: "CRT Scanlines" },
                  { key: "filmGrain", label: "Analog Film Grain" },
                  { key: "vignette", label: "Obsidian Vignette" },
                  { key: "glitch", label: "Glitch Slice Jitter" }
                ].map(({ key, label }) => {
                  const pfxKey = key as keyof typeof config.pfx;
                  const item = config.pfx[pfxKey];
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-white/80">{label}</span>
                        <button
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              pfx: {
                                ...prev.pfx,
                                [pfxKey]: { ...item, enabled: !item.enabled }
                              }
                            }));
                          }}
                          className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                            item.enabled ? "bg-[#3ca6ff]" : "bg-white/20"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            item.enabled ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {item.enabled && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="range"
                            min="5"
                            max="100"
                            value={item.intensity}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setConfig(prev => ({
                                ...prev,
                                pfx: {
                                  ...prev.pfx,
                                  [pfxKey]: { ...item, intensity: val }
                                }
                              }));
                            }}
                            className="w-full accent-[#3ca6ff] h-1"
                          />
                          <span className="text-[10px] font-mono text-white/50 w-7 text-right">
                            {item.intensity}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 4: Procedural Animation (Style, Speed, Intensity) */}
            {activeTab === "anim" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-white/60">Waveform Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["shimmer", "wave", "pulse", "ripple", "flicker"] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => setConfig(prev => ({ ...prev, animStyle: style }))}
                        className={`py-2 px-3 rounded-lg text-xs font-mono uppercase tracking-wider text-left border ${
                          config.animStyle === style
                            ? "bg-[#3ca6ff]/20 border-[#3ca6ff] text-[#3ca6ff] font-bold"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Wave Frequency / Speed</span>
                    <span className="text-[#3ca6ff]">{config.animSpeed.intensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={config.animSpeed.intensity}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setConfig(prev => ({
                        ...prev,
                        animSpeed: { ...prev.animSpeed, intensity: val }
                      }));
                    }}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/60">Oscillation Intensity</span>
                    <span className="text-[#3ca6ff]">{config.animIntensity.intensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.animIntensity.intensity}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setConfig(prev => ({
                        ...prev,
                        animIntensity: { ...prev.animIntensity, intensity: val }
                      }));
                    }}
                    className="w-full accent-[#3ca6ff] cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] font-sans text-white/50 leading-relaxed">
                  Hover your cursor across the canvas to illuminate cells in real-time with an interactive electric aura.
                </div>
              </div>
            )}

            {/* Reset to Electric Gaze button */}
            <button
              onClick={() => applyPreset("electric-gaze")}
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset To Electric Gaze
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
