import React from 'react';
import { ShaderBackground } from './dark-mono';

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
  className?: string;
}

// Reusable Hero Component
const Hero: React.FC<HeroProps> = ({
  logoSrc,
  headline,
  className = ""
}) => {
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
      
      {/* 21st.dev Dark Mono Mesh Drift Shader Background */}
      <ShaderBackground className="absolute inset-0 w-full h-full" />
      
      {/* Soft Vignette and Bottom Obsidian Gradient Fade to seamlessly blend into agency page */}
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

export default Hero;
