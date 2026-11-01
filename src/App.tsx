/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Menu, X, MessageCircle, Star, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import Hero from './components/ui/animated-shader-hero';
import ShaderBackground from './components/ui/shader-background';
import { ShaderCanvas, SHADER_SRC as NEW_SHADER } from './components/ui/launch';
import { FloatingPaths } from './components/ui/background-paths';
import WeblyfyLogo from './assets/images/logo.png';
import NeuralBackground from './components/ui/flow-field-background';
import CreationOfAdamBackground from './components/ui/creation-of-adam-background';
import PerspectiveAsciiBackground from './components/ui/perspective-ascii-background';

const SHADERS = [
  // Shader 1: Liquid Aurora / Obsidian (Need amazing platforms)
  `precision highp float;
  uniform float time;
  uniform vec2 resolution;

  void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 pos = uv * 2.0 - 1.0;
      pos.x *= resolution.x / resolution.y;
      
      float t = time * 0.1;
      
      // Soft flowing gradients
      float v1 = sin(pos.x * 1.5 + t) * cos(pos.y * 1.5 + t * 0.8);
      float v2 = sin(pos.x * 2.0 - t * 1.2) * cos(pos.y * 2.0 - t * 0.5);
      
      float blend = smoothstep(-0.5, 0.5, v1 + v2);
      
      // Rich, dark, minimal colors
      vec3 col1 = vec3(0.02, 0.02, 0.03); // Deep blue-black
      vec3 col2 = vec3(0.05, 0.06, 0.08); // Slate grey-blue
      
      vec3 color = mix(col1, col2, blend);
      
      // Add very faint dynamic glow in the center
      float glow = exp(-length(pos + vec2(sin(t)*0.5, cos(t*0.8)*0.5)) * 2.0);
      color += vec3(0.04, 0.04, 0.06) * glow;
      
      // High-end film grain (noise)
      float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
      color += vec3(noise);
      
      gl_FragColor = vec4(color, 1.0);
  }`,
  // Shader 2: Ethereal Light Sweep / Soft Volumetrics (Exceptional by design)
  `precision highp float;
  uniform float time;
  uniform vec2 resolution;

  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.15;
      
      vec2 p = uv;
      p *= rot(t * 0.1);
      
      float n = 0.0;
      for(float i = 1.0; i < 5.0; i++) {
          p.x += sin(t * 0.8 + p.y * 2.0 * i) * 0.1;
          p.y += cos(t * 0.9 + p.x * 2.0 * i) * 0.1;
          n += length(p);
      }
      
      n = sin(n * 2.0 - t * 2.0) * 0.5 + 0.5;
      
      vec3 col = mix(vec3(0.01, 0.01, 0.02), vec3(0.06, 0.06, 0.08), n);
      col += vec3(0.03, 0.04, 0.05) * smoothstep(0.8, 1.0, n);
      
      // vignette
      col *= 1.3 - length(uv) * 1.5;
      col += noise(uv) * 0.02; // film grain
      
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`,
  // Shader 3: Micro-dust / Quantum Void (Powerful automation)
  `precision highp float;
  uniform float time;
  uniform vec2 resolution;

  float distLine(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a, ba = b - a;
      float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * t);
  }

  float hash21(vec2 p) {
      p = fract(p * vec2(233.34, 851.73));
      p += dot(p, p + 23.45);
      return fract(p.x * p.y);
  }

  vec2 getPos(vec2 id, vec2 offs, float t) {
      float n = hash21(id + offs);
      float x = sin(t * 0.5 * n) * 0.4;
      float y = cos(t * 0.5 * fract(n * 34.23)) * 0.4;
      return offs + vec2(x, y);
  }

  void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.3;
      
      uv *= 4.0; // scale
      
      vec2 gv = fract(uv) - 0.5;
      vec2 id = floor(uv);
      
      float m = 0.0;
      
      vec2 p[9];
      p[0] = getPos(id, vec2(-1.0, -1.0), t);
      p[1] = getPos(id, vec2( 0.0, -1.0), t);
      p[2] = getPos(id, vec2( 1.0, -1.0), t);
      p[3] = getPos(id, vec2(-1.0,  0.0), t);
      p[4] = getPos(id, vec2( 0.0,  0.0), t);
      p[5] = getPos(id, vec2( 1.0,  0.0), t);
      p[6] = getPos(id, vec2(-1.0,  1.0), t);
      p[7] = getPos(id, vec2( 0.0,  1.0), t);
      p[8] = getPos(id, vec2( 1.0,  1.0), t);
      
      for(int i=0; i<9; i++) {
          // points
          m += smoothstep(0.06, 0.02, length(gv - p[i])); 
          
          // sparks
          vec2 dir = (p[i] - gv) * 20.0;
          float spark = 1.0 / dot(dir, dir);
          m += spark * 0.02;
          
          for(int j=0; j<9; j++) {
              if(j > i) {
                  float d = distLine(gv, p[i], p[j]);
                  float distBetween = length(p[i] - p[j]);
                  
                  float lineFade = smoothstep(1.3, 0.5, distBetween);
                  m += smoothstep(0.02, 0.01, d) * lineFade * 0.4;
                  m += 0.001 / d * lineFade; // glow
              }
          }
      }
      
      vec3 col = vec3(m * 0.05, m * 0.07, m * 0.1);
      col += vec3(0.01, 0.01, 0.015); // base dark background
      
      float vig = length(uv/4.0);
      col *= smoothstep(0.8, 0.2, vig);
      
      // tiny bit of grain
      float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.015;
      col += vec3(noise);
      
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`
];

const SECTIONS = [
  {
    id: "platforms",
    title: "need amazing\nplatforms",
    titleAlign: "left",
    subtitle: "Empowering businesses to stand out with strategy, creativity, and high-performing websites and web applications.",
    bgColor: "from-[#0a0a0a] to-[#000000]",
    shader: SHADERS[0]
  },
  {
    id: "ai",
    title: "exceptional\nby design",
    titleAlign: "left",
    subtitle: "We craft distinct, conversational AI Agents and Calling Bots that handle interactions 24/7, elevating your customer experience.",
    bgColor: "from-[#111111] to-[#050505]",
    shader: SHADERS[1]
  },
  {
    id: "automation",
    title: "powerful\nautomation",
    titleAlign: "left",
    subtitle: "We design impactful WhatsApp Automations and connected workflows, shaping your operations and amplifying efficiency.",
    bgColor: "from-[#050505] to-[#000000]",
    shader: SHADERS[2]
  }
];

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 px-4 py-4 md:px-8 md:py-8 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center">
          <a
            href="https://wa.me/918096000080"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:scale-110 transition-transform duration-300 mix-blend-difference p-2"
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.05z"></path>
              <path d="M9 10a.5 .5 0 0 0 1 0V9a.5 .5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0-1h-1a.5 .5 0 0 0 0 1"></path>
            </svg>
          </a>
        </div>

        <button 
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:scale-110 transition-transform pointer-events-auto text-white mix-blend-difference"
        >
          <Menu className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] bg-[#050505] text-white flex flex-col justify-center px-6 sm:px-8 md:px-24"
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <X className="w-6 h-6 md:w-8 md:h-8" />
            </button>

            <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8 w-full max-h-[80vh] overflow-y-auto overflow-x-hidden no-scrollbar">
              {['Home', ...SECTIONS.map(s => s.id), 'work', 'Contact'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + (i * 0.1), ease: [0.16, 1, 0.3, 1] }}
                >
                  <button 
                    onClick={() => {
                      if (item === 'Home') {
                        setIsOpen(false);
                        if (window.location.pathname !== '/') {
                          navigate('/');
                          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 500);
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }
                      else if (item === 'Contact') scrollToSection('contact');
                      else scrollToSection(item);
                    }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-[500] uppercase tracking-tighter hover:text-white/50 transition-colors text-center leading-[1.1]"
                  >
                    {item}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


function Section({ data, index, onExplore }: { data: typeof SECTIONS[0], index: number, onExplore?: (id: string) => void }) {
  const isCenter = data.titleAlign === 'center';
  const navigate = useNavigate();
  
  return (
    <section id={data.id} style={{ position: 'relative' }} className="relative flex flex-col justify-end min-h-[100svh] pb-16 md:pb-32 px-5 sm:px-8 md:px-16 lg:px-24 w-full overflow-hidden">
      <div className={`absolute inset-0 z-0 bg-gradient-to-b ${data.bgColor} dark`}>
        {data.id === 'platforms' ? (
          <CreationOfAdamBackground opacity={0.85} />
        ) : data.id === 'ai' ? (
          <PerspectiveAsciiBackground opacity={0.85} />
        ) : data.id === 'automation' ? (
          <NeuralBackground color="#818cf8" trailOpacity={0.1} speed={0.8} />
        ) : null}
      </div>
      
      <div className={`relative z-10 w-full max-w-screen-2xl mx-auto flex flex-col ${isCenter ? 'items-center text-center' : 'items-start text-left'} md:flex-row md:justify-between md:items-end gap-6 md:gap-10`}>
        <motion.h1 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`font-serif italic font-[300] text-[2.75rem] leading-[1] sm:text-6xl md:text-7xl lg:text-[8rem] xl:text-[9rem] md:leading-[0.85] tracking-tight whitespace-pre-line lowercase text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${isCenter ? 'md:mx-auto md:mb-12' : ''}`}
        >
          {data.title}
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, x: isCenter ? 0 : 50, y: isCenter ? 30 : 0 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`md:max-w-md flex flex-col gap-5 md:gap-6 md:pb-4 ${isCenter ? 'items-center text-center' : ''}`}
        >
          <div className="bg-black/50 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col gap-4">
            <p className="text-base md:text-lg font-sans font-[400] leading-relaxed text-white drop-shadow-md">
              {data.subtitle}
            </p>
            <button 
              onClick={() => {
                if (onExplore) {
                  onExplore(data.id);
                } else {
                  navigate(`/#${data.id}`);
                }
              }}
              className="flex items-center gap-2 text-xs font-[600] tracking-[0.2em] uppercase text-white hover:text-cyan-400 transition-colors w-fit border-b border-white/40 hover:border-cyan-400 pb-1.5 group mt-1"
            >
              Explore
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const WORKS = [
  {
    name: "Kaafirana Cafe",
    domain: "kaafiranacafe.com",
    role: "Web Design & Development",
    year: "2026"
  },
  {
    name: "Social Spark",
    domain: "socialspark.co.in",
    role: "Web Design & Development",
    year: "2026"
  },
  {
    name: "Chaiholic",
    domain: "chaiholic.in",
    role: "Web Design & Development",
    year: "2026"
  }
];

function WorkSection() {
  return (
    <section id="work" className="relative flex flex-col justify-center min-h-[100svh] py-24 md:py-32 px-5 sm:px-8 md:px-16 lg:px-24 w-full bg-[#050505] text-white">
      <div className="w-full max-w-screen-2xl mx-auto flex flex-col gap-12 md:gap-24 relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic font-[300] text-5xl sm:text-6xl md:text-7xl lg:text-[8rem] tracking-tight leading-[0.9]"
          >
            our selected<br/><span className="font-display not-italic uppercase tracking-tighter">work.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-white/60 font-sans font-[300] text-base md:text-lg max-w-xs"
          >
            A glimpse into the digital experiences we've crafted for ambitious brands.
          </motion.p>
        </div>

        <div className="flex flex-col border-t border-white/10">
          {WORKS.map((work, i) => (
            <motion.a
              key={work.domain}
              href={`https://${work.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col md:flex-row md:items-center justify-between py-8 md:py-12 border-b border-white/10 hover:bg-white/[0.02] transition-colors px-4 -mx-4 rounded-xl"
            >
              <div className="flex flex-col mb-4 md:mb-0">
                <h3 className="font-display font-[500] text-3xl md:text-5xl lg:text-6xl tracking-tighter uppercase mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/40 transition-all duration-500">
                  {work.name}
                </h3>
                <span className="font-serif italic text-white/50 text-lg md:text-xl group-hover:text-white transition-colors">
                  {work.domain}
                </span>
              </div>
              
              <div className="flex items-center justify-between md:justify-end md:gap-16 w-full md:w-auto">
                <div className="flex flex-col items-start md:items-end w-1/2 md:w-auto">
                  <span className="font-sans font-[500] text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1">Role</span>
                  <span className="font-sans font-[300] text-sm md:text-base text-white/80">{work.role}</span>
                </div>
                <div className="flex flex-col items-end w-1/2 md:w-auto">
                  <span className="font-sans font-[500] text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1">Year</span>
                  <span className="font-sans font-[300] text-sm md:text-base text-white/80">{work.year}</span>
                </div>
                
                <div className="hidden md:flex ml-4 w-12 h-12 rounded-full border border-white/20 items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                  <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const containerRef = useRef<HTMLElement>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hi Weblyfy, I'm ${name} (${email}). I need help with: ${selectedTag || 'General Inquiry'}.`;
    window.open(`https://wa.me/918096000080?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section id="contact" ref={containerRef} style={{ position: 'relative' }} className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black pointer-events-none">
        <div 
          className="w-full h-full opacity-60 origin-center transform scale-110"
        >
          <iframe 
            title="Earth" 
            frameBorder="0" 
            allowFullScreen={true} 
            allow="autoplay; fullscreen; xr-spatial-tracking" 
            src="https://sketchfab.com/models/41fc80d85dfd480281f21b74b2de2faa/embed?autostart=1&autospin=0.2&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_stop=0" 
            className="w-full h-full pointer-events-auto"
          ></iframe>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-5 sm:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center h-full">
          <div className="flex flex-col justify-center">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-serif italic font-[300] text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] tracking-tight leading-[1.4] md:leading-[1.3] mb-8 md:mb-12 text-white/80"
            >
               world-class websites, web apps and AI automations for ambitious businesses across the globe. From strategy to launch, we help you look premium and sell better.
            </motion.h2>

            <motion.h3
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.3 }}
               className="font-display font-[500] uppercase text-[2rem] sm:text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.1] md:leading-[1] text-white tracking-tighter max-w-[15ch]"
            >
               Let's make your brand<br/>unforgettable.
            </motion.h3>

            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 md:mt-16 grid grid-cols-2 gap-6 md:gap-8 max-w-lg"
            >
              <div>
                <div className="text-xs text-white/50 font-[800] tracking-widest uppercase mb-2">Email</div>
                <a href="mailto:weblyfy8@gmail.com" className="text-sm font-[600] hover:underline text-white">weblyfy8@gmail.com</a>
              </div>
              <div>
                <div className="text-xs text-white/50 font-[800] tracking-widest uppercase mb-2">Location</div>
                <div className="text-sm font-[600] text-white">Global Operations</div>
              </div>
            </motion.div>
          </div>

          <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#111111]/80 backdrop-blur-3xl border border-white/5 rounded-3xl md:rounded-[2rem] p-6 sm:p-8 md:p-12 shadow-2xl relative"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-[800] tracking-wide text-white uppercase">Connected</span>
            </div>

            <h3 className="font-serif italic font-[300] text-3xl md:text-4xl lg:text-5xl mb-3 tracking-tight">From Brand to Icon.</h3>
            <p className="text-white/60 mb-8 md:mb-10 text-[0.9rem] md:text-base font-sans font-[300] leading-relaxed">Tell us about your project and we'll get back within 24 hours.</p>

            <a href="https://wa.me/918096000080" target="_blank" rel="noopener noreferrer" className="w-full bg-white hover:bg-gray-200 text-black rounded-xl p-5 flex items-center justify-center gap-3 font-sans font-[600] tracking-[0.1em] text-[11px] uppercase transition-all hover:scale-[1.02] active:scale-[0.98] mb-8">
              <MessageCircle className="w-4 h-4" />
              Start a WhatsApp Conversation
            </a>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs font-[800] tracking-widest text-white/40 uppercase">Or fill the form</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <form className="space-y-4 md:space-y-6" onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-sans font-[600] tracking-[0.2em] uppercase text-white/50 mb-2 pl-1">Name *</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 md:px-5 py-3.5 md:py-4 text-white focus:outline-none focus:border-white/30 transition-colors font-sans font-[300] placeholder:text-white/20 text-[15px]" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-sans font-[600] tracking-[0.2em] uppercase text-white/50 mb-2 pl-1">Email *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 md:px-5 py-3.5 md:py-4 text-white focus:outline-none focus:border-white/30 transition-colors font-sans font-[300] placeholder:text-white/20 text-[15px]" placeholder="Your email" />
                </div>
              </div>

              <div>
                 <label className="block text-[9px] md:text-[10px] font-sans font-[600] tracking-[0.2em] uppercase text-white/50 mb-3 pl-1">What do you need help with? *</label>
                 <div className="flex flex-wrap gap-2.5">
                   {['Website', 'Web App', 'AI Agent', 'Calling Bot', 'WhatsApp', 'Other'].map(tag => (
                     <button 
                        key={tag} 
                        type="button" 
                        onClick={() => setSelectedTag(tag)}
                        className={`text-xs font-sans font-[500] rounded-full px-5 py-2.5 transition-all ${
                          selectedTag === tag 
                            ? 'bg-white text-black border-transparent' 
                            : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 hover:text-white'
                        }`}
                     >
                       {tag}
                     </button>
                   ))}
                 </div>
              </div>

              <button type="submit" className="w-full border border-white hover:bg-white text-white hover:text-black rounded-xl p-5 font-sans font-[500] tracking-[0.15em] text-[11px] uppercase mt-6 transition-all">
                Send Request
              </button>
            </form>
          </motion.div>
        </div>
      </div>
      
      <div className="absolute bottom-5 md:bottom-8 left-5 md:left-8 right-5 md:right-8 flex justify-center md:justify-between items-center z-20 text-white/40 text-[9px] md:text-[10px] font-sans font-[500] tracking-[0.2em] uppercase pointer-events-none">
        <span className="pointer-events-auto hover:text-white transition-colors cursor-pointer">WEBLYFY © {new Date().getFullYear()}</span>
        <span className="pointer-events-auto hover:text-white transition-colors cursor-pointer hidden md:block">Designed for Ambition</span>
      </div>
    </section>
  )
}

function Loader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-4">
          <img 
            src={WeblyfyLogo} 
            alt="Weblyfy Logo" 
            className="w-full h-full object-contain opacity-90"
          />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"
            initial={{ y: "0%" }}
            animate={{ y: "-100%" }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-white/40 font-sans tracking-[0.3em] text-[10px] uppercase"
          >
            Loading Experience
          </motion.div>
          <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white/70"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const CAPABILITIES_DATA: Record<string, {
  title: string;
  subtitle: string;
  paragraphs: string[];
  capabilities: string[];
}> = {
  platforms: {
    title: "need amazing\nplatforms",
    subtitle: "Empowering businesses to stand out with strategy, creativity, and high-performing websites and web applications.",
    paragraphs: [
      "At Weblyfy, we understand that platforms are more than just technology; they are the foundation of your digital presence and operational scale. Our approach dives deep into the core mechanics of your business to engineer custom solutions that simply work beautifully.",
      "From robust architecture to pixel-perfect design, our expert team utilizes modern frameworks and relentless innovation to bring your vision to life. No templates, no compromises."
    ],
    capabilities: [
      "Strategy & Architecture",
      "Custom Engineering",
      "Seamless Integration",
      "Continuous Optimization"
    ]
  },
  ai: {
    title: "exceptional\nby design",
    subtitle: "We craft distinct, conversational AI Agents and Calling Bots that handle interactions 24/7, elevating your customer experience.",
    paragraphs: [
      "At Weblyfy, we engineer intelligent voice agents and conversational AI that represent your brand with perfection. Whether handling inbound inquiries or qualifying leads, our bots speak naturally and deliver results around the clock.",
      "Powered by advanced LLMs, real-time voice latency optimization, and custom CRM integrations, your AI agents become your most dependable team members."
    ],
    capabilities: [
      "Conversational AI Architecture",
      "Real-time Calling Bots",
      "CRM & Pipeline Integration",
      "24/7 Omnichannel Deployment"
    ]
  },
  automation: {
    title: "powerful\nautomation",
    subtitle: "We design impactful WhatsApp Automations and connected workflows, shaping your operations and amplifying efficiency.",
    paragraphs: [
      "Scale your customer conversations and operational speed with customized WhatsApp automations and interconnected business workflows designed to eliminate manual bottlenecks.",
      "From automatic lead capture to automated follow-ups and notifications, we transform your customer journey into a frictionless, high-converting pipeline."
    ],
    capabilities: [
      "WhatsApp Business API Setup",
      "Interactive Chat Flows",
      "Connected Webhook Triggers",
      "Automated Lead Qualification"
    ]
  }
};

function CapabilitiesModal({ 
  sectionId, 
  onClose 
}: { 
  sectionId: string; 
  onClose: () => void 
}) {
  const data = CAPABILITIES_DATA[sectionId];
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-white max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-7 sm:right-7 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono mb-2 block">
          Weblyfy Capabilities
        </span>

        <h2 className="font-serif italic font-[300] text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1] mb-4 whitespace-pre-line">
          {data.title}
        </h2>

        <p className="text-white/80 font-sans text-base sm:text-lg mb-8 leading-relaxed">
          {data.subtitle}
        </p>

        <div className="space-y-4 text-white/70 font-sans text-sm sm:text-base leading-relaxed mb-8">
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-sans font-semibold mb-4">
            Core Capabilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-neutral-200">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href={`https://wa.me/918096000080?text=${encodeURIComponent(`Hi Weblyfy, I would like to learn more about your ${data.title.replace('\n', ' ')} solutions.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Start a WhatsApp Conversation</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </motion.div>
    </motion.div>
  );
}

let initialLoadComplete = false;

function MainScreen() {
  const [loading, setLoading] = useState(!initialLoadComplete);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    if (initialLoadComplete) return;
    const timer = setTimeout(() => {
      setLoading(false);
      initialLoadComplete = true;
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen flex flex-col relative">
      <AnimatePresence>
        {loading && <Loader />}
      </AnimatePresence>
      <AnimatePresence>
        {activeModal && (
          <CapabilitiesModal 
            sectionId={activeModal} 
            onClose={() => setActiveModal(null)} 
          />
        )}
      </AnimatePresence>
      <Navigation />
      <div className="relative w-full min-h-screen">
        <Hero
          logoSrc={WeblyfyLogo}
        />
      </div>
      {SECTIONS.map((section, idx) => (
         <Section 
           key={section.id} 
           data={section} 
           index={idx} 
           onExplore={(id) => setActiveModal(id)}
         />
      ))}
      <WorkSection />
      <ContactSection />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/explore/:id" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

