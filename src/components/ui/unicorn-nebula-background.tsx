import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    UnicornStudio?: {
      init: () => void;
      destroy?: () => void;
    };
  }
}

interface UnicornNebulaBackgroundProps {
  className?: string;
  projectId?: string;
}

export default function UnicornNebulaBackground({
  className = '',
  projectId = 'joUk1IODLjek5y64lyZ0'
}: UnicornNebulaBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scriptEl = document.querySelector('script[src="/js/unicornStudio.clean.js"]') as HTMLScriptElement | null;
    
    const initUnicorn = () => {
      if (window.UnicornStudio && typeof window.UnicornStudio.init === 'function') {
        window.UnicornStudio.init();
      }
    };

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.src = '/js/unicornStudio.clean.js';
      scriptEl.async = true;
      scriptEl.onload = () => {
        initUnicorn();
      };
      document.body.appendChild(scriptEl);
    } else {
      initUnicorn();
    }
  }, [projectId]);

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}>
      {/* Unicorn Studio Clean Canvas Container */}
      <div 
        ref={containerRef}
        data-us-project={projectId}
        data-us-scale="1"
        data-us-dpi="1.5"
        className="w-full h-full relative opacity-90"
      />

      {/* Atmospheric Overlays for agency luxury feel */}
      <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/30 to-[#050505] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />

      {/* Bulletproof watermark prevention styles */}
      <style>{`
        div[data-us-project] a[href*="unicorn.studio"],
        div[data-us-project] img[alt*="unicorn.studio"],
        div[data-us-project] > a,
        a[href*="unicorn.studio"],
        img[src*="made_in_us"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
        }
      `}</style>
    </div>
  );
}
