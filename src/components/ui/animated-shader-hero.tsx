import React, { useRef, useEffect } from 'react';

// Types for component props
interface HeroProps {
  logoSrc?: string;
  trustBadge?: {
    text: string;
    icons?: React.ReactNode[];
  };
  headline?: {
    line1: string;
    line2?: string;
  };
  subtitle?: string;
  buttons?: {
    primary?: {
      text: string;
      onClick?: () => void;
    };
    secondary?: {
      text: string;
      onClick?: () => void;
    };
  };
  unicornProjectId?: string;
  className?: string;
}

// Reusable Shader Background Hook
const useShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<any>(null);
  const pointersRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    class WebGLRenderer {
      private canvas: HTMLCanvasElement;
      private gl: WebGL2RenderingContext;
      private program: WebGLProgram | null = null;
      private vs: WebGLShader | null = null;
      private fs: WebGLShader | null = null;
      private buffer: WebGLBuffer | null = null;
      private scale: number;
      private shaderSource: string;
      private mouseMove = [0, 0];
      private mouseCoords = [0, 0];
      private pointerCoords = [0, 0];
      private nbrOfPointers = 0;

      private vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

      private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

      constructor(canvas: HTMLCanvasElement, scale: number) {
        this.canvas = canvas;
        this.scale = scale;
        this.gl = canvas.getContext('webgl2')!;
        this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
        this.shaderSource = defaultShaderSource;
      }

      updateShader(source: string) {
        this.reset();
        this.shaderSource = source;
        this.setup();
        this.init();
      }

      updateMove(deltas: number[]) {
        this.mouseMove = deltas;
      }

      updateMouse(coords: number[]) {
        this.mouseCoords = coords;
      }

      updatePointerCoords(coords: number[]) {
        this.pointerCoords = coords;
      }

      updatePointerCount(nbr: number) {
        this.nbrOfPointers = nbr;
      }

      updateScale(scale: number) {
        this.scale = scale;
        this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale);
      }

      compile(shader: WebGLShader, source: string) {
        const gl = this.gl;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const error = gl.getShaderInfoLog(shader);
          console.error('Shader compilation error:', error);
        }
      }

      test(source: string) {
        let result = null;
        const gl = this.gl;
        const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          result = gl.getShaderInfoLog(shader);
        }
        gl.deleteShader(shader);
        return result;
      }

      reset() {
        const gl = this.gl;
        if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
          if (this.vs) {
            gl.detachShader(this.program, this.vs);
            gl.deleteShader(this.vs);
          }
          if (this.fs) {
            gl.detachShader(this.program, this.fs);
            gl.deleteShader(this.fs);
          }
          gl.deleteProgram(this.program);
        }
      }

      setup() {
        const gl = this.gl;
        this.vs = gl.createShader(gl.VERTEX_SHADER)!;
        this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        this.compile(this.vs, this.vertexSrc);
        this.compile(this.fs, this.shaderSource);
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, this.vs);
        gl.attachShader(this.program, this.fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          console.error(gl.getProgramInfoLog(this.program));
        }
      }

      init() {
        const gl = this.gl;
        const program = this.program!;
        
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        (program as any).resolution = gl.getUniformLocation(program, 'resolution');
        (program as any).time = gl.getUniformLocation(program, 'time');
        (program as any).move = gl.getUniformLocation(program, 'move');
        (program as any).touch = gl.getUniformLocation(program, 'touch');
        (program as any).pointerCount = gl.getUniformLocation(program, 'pointerCount');
        (program as any).pointers = gl.getUniformLocation(program, 'pointers');
      }

      render(now = 0) {
        const gl = this.gl;
        const program = this.program;
        
        if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        
        gl.uniform2f((program as any).resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f((program as any).time, now * 1e-3);
        gl.uniform2f((program as any).move, ...this.mouseMove);
        gl.uniform2f((program as any).touch, ...this.mouseCoords);
        gl.uniform1i((program as any).pointerCount, this.nbrOfPointers);
        gl.uniform2fv((program as any).pointers, this.pointerCoords);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    class PointerHandler {
      private scale: number;
      private active = false;
      private pointers = new Map<number, number[]>();
      private lastCoords = [0, 0];
      private moves = [0, 0];

      constructor(element: HTMLCanvasElement, scale: number) {
        this.scale = scale;
        
        const map = (element: HTMLCanvasElement, scale: number, x: number, y: number) => 
          [x * scale, element.height - y * scale];

        element.addEventListener('pointerdown', (e) => {
          this.active = true;
          this.pointers.set(e.pointerId, map(element, this.getScale(), e.clientX, e.clientY));
        });

        element.addEventListener('pointerup', (e) => {
          if (this.count === 1) {
            this.lastCoords = this.first;
          }
          this.pointers.delete(e.pointerId);
          this.active = this.pointers.size > 0;
        });

        element.addEventListener('pointerleave', (e) => {
          if (this.count === 1) {
            this.lastCoords = this.first;
          }
          this.pointers.delete(e.pointerId);
          this.active = this.pointers.size > 0;
        });

        element.addEventListener('pointermove', (e) => {
          if (!this.active) return;
          this.lastCoords = [e.clientX, e.clientY];
          this.pointers.set(e.pointerId, map(element, this.getScale(), e.clientX, e.clientY));
          this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY];
        });
      }

      getScale() {
        return this.scale;
      }

      updateScale(scale: number) {
        this.scale = scale;
      }

      get count() {
        return this.pointers.size;
      }

      get move() {
        return this.moves;
      }

      get coords() {
        return this.pointers.size > 0 
          ? Array.from(this.pointers.values()).flat() 
          : [0, 0];
      }

      get first() {
        return this.pointers.values().next().value || this.lastCoords;
      }
    }

    const canvas = canvasRef.current;
    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
    
    rendererRef.current = new WebGLRenderer(canvas, dpr);
    pointersRef.current = new PointerHandler(canvas, dpr);
    
    rendererRef.current.setup();
    rendererRef.current.init();
    
    const resize = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      if (rendererRef.current) {
        rendererRef.current.updateScale(dpr);
      }
    };
    
    resize();
    
    if (rendererRef.current.test(defaultShaderSource) === null) {
      rendererRef.current.updateShader(defaultShaderSource);
    }
    
    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isIntersecting = entry.isIntersecting;
      });
    }, { threshold: 0 });
    intersectionObserver.observe(canvas);

    const loop = (now: number) => {
      if (!rendererRef.current || !pointersRef.current) return;
      if (isIntersecting) {
        rendererRef.current.updateMouse(pointersRef.current.first);
        rendererRef.current.updatePointerCount(pointersRef.current.count);
        rendererRef.current.updatePointerCoords(pointersRef.current.coords);
        rendererRef.current.updateMove(pointersRef.current.move);
        rendererRef.current.render(now);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    
    loop(0);
    window.addEventListener('resize', resize);
    
    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.reset();
      }
      intersectionObserver.disconnect();
    };
  }, []);

  return canvasRef;
};

// Reusable Hero Component
const Hero: React.FC<HeroProps> = ({
  logoSrc,
  trustBadge,
  headline,
  subtitle,
  buttons,
  unicornProjectId,
  className = ""
}) => {
  const canvasRef = useShaderBackground();

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-black ${className}`}>
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-600 { animation-delay: 0.6s; }
      `}</style>
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block touch-none"
        style={{ background: '#050505' }}
      />
      <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/40 to-[#050505] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />
      
      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white px-6">
        <div className={`text-center w-full mx-auto pointer-events-none ${logoSrc ? '' : 'max-w-[100vw] mix-blend-difference'}`}>
          {/* Main Heading with Animation */}
          <div className="flex flex-col items-center justify-center w-full">
            {logoSrc ? (
              <img 
                src={logoSrc} 
                alt="Logo" 
                className="absolute top-32 md:top-32 lg:top-32 left-1/2 -translate-x-1/2 w-full max-w-[50vw] md:max-w-[250px] lg:max-w-[300px] object-contain animate-fade-in-up animation-delay-200"
              />
            ) : headline ? (
              <h1 className="font-display font-[500] text-[18vw] leading-[0.8] tracking-tighter uppercase text-white animate-fade-in-up animation-delay-200">
                {headline.line1}
              </h1>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center animate-fade-in-up animation-delay-600 z-30 opacity-50 mix-blend-difference">
         <span className="text-[10px] font-sans font-[600] tracking-[0.3em] uppercase text-white mb-6 transform -rotate-90 origin-center translate-y-4">Scroll</span>
         <div className="w-[1px] h-24 bg-gradient-to-b from-white/0 via-white to-white/0 opacity-50" />
      </div>

    </div>
  );
};

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 touch;
uniform vec2 move;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    mat2 m = rot(0.37);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = m * p * 2.02;
        a *= 0.5;
    }
    return v;
}

// Domain Warping for fluid cosmic clouds (Unicorn Studio Nebula Skies)
float pattern(in vec2 p, out vec2 q, out vec2 r, float t) {
    q = vec2(fbm(p + vec2(0.0, 0.0) + t * 0.05),
             fbm(p + vec2(5.2, 1.3) - t * 0.04));

    r = vec2(fbm(p + 3.8 * q + vec2(1.7, 9.2) + t * 0.08),
             fbm(p + 3.8 * q + vec2(8.3, 2.8) - t * 0.06));

    return fbm(p + 3.6 * r + t * 0.03);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
    
    // Mouse interaction displacement
    vec2 mouseNorm = (touch.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
    float mouseDist = length(uv - mouseNorm);
    float mousePush = exp(-mouseDist * 3.0);
    uv += (uv - mouseNorm) * mousePush * 0.15;

    float t = time * 0.12;

    // Cosmic coordinates
    vec2 p = uv * 2.2;
    p *= rot(t * 0.05);

    vec2 q, r;
    float f = pattern(p, q, r, t);

    // Exact Unicorn Studio Nebula Skies Palette
    // Cyan/Electric Blue: vec3(0.333, 0.976, 1.0)
    // Deep Violet/Navy: vec3(0.267, 0.314, 0.518)
    // Accent Magenta Glow: vec3(0.902, 0.0, 0.898)
    // Void: vec3(0.015, 0.015, 0.02)
    vec3 colCyan = vec3(0.333, 0.976, 1.0);
    vec3 colViolet = vec3(0.267, 0.314, 0.518);
    vec3 colMagenta = vec3(0.902, 0.0, 0.898);
    vec3 colVoid = vec3(0.015, 0.015, 0.02);

    // Dynamic Color Mixing
    vec3 col = mix(colVoid, colViolet, clamp(f * f * 2.2, 0.0, 1.0));
    col = mix(col, colCyan, clamp(length(q) * 1.1, 0.0, 1.0) * smoothstep(0.1, 0.8, f));
    col += colMagenta * pow(clamp(length(r.x), 0.0, 1.0), 3.0) * 0.75;
    col += colCyan * pow(clamp(f, 0.0, 1.0), 4.0) * 0.6;

    // Normal map surface lighting
    float d1 = fbm(p + vec2(0.01, 0.0));
    float d2 = fbm(p + vec2(0.0, 0.01));
    vec2 grad = vec2(d1 - f, d2 - f) * 20.0;
    vec3 lightDir = normalize(vec3(0.5, 0.7, 0.5));
    vec3 normal = normalize(vec3(-grad, 1.0));
    float diff = max(0.0, dot(normal, lightDir));
    col += colCyan * pow(diff, 6.0) * 0.35;

    // Subtle star dust
    float dust = pow(hash(gl_FragCoord.xy + fract(time * 0.01)), 35.0) * 0.35;
    col += vec3(dust);

    // Soft vignette
    float vig = 1.0 - smoothstep(0.4, 1.4, length(uv));
    col *= vig;

    // Bottom gradient fade into deep obsidian black #050505
    float bottomFade = smoothstep(0.0, 0.35, gl_FragCoord.y / resolution.y);
    col *= bottomFade;

    O = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export default Hero;
