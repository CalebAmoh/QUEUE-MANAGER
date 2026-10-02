import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: Invalid coordinate accessed:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden font-mono selection:bg-white selection:text-black">
      <BackgroundBeams className="opacity-10" />
      
      <div className="relative z-10 flex flex-col min-h-screen p-8 md:p-20">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">Error Protocol</p>
            <p className="text-xs font-bold">FAULT_CODE_404</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">Origin</p>
            <p className="text-xs font-bold truncate max-w-[200px] inline-block uppercase tracking-tighter italic opacity-80 decoration-white/20 underline underline-offset-4">
              {location.pathname}
            </p>
          </div>
        </header>

        {/* Main Brutalist Content */}
        <main className="my-20 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[15vw] md:text-[20vw] leading-[0.7] font-black tracking-[-0.08em] uppercase italic mb-12">
              Lost.
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
              <p className="text-xl md:text-3xl font-bold leading-none tracking-tighter max-w-sm">
                THE REQUESTED COORDINATE HAS BEEN DE-INDEXED OR NEVER EXISTED WITHIN THIS PERIMETER.
              </p>
              
              <div className="flex flex-col items-start gap-8">
                <div className="w-full h-px bg-white/10" />
                <Link 
                  to="/" 
                  className="group relative inline-block"
                >
                  <span className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase transition-colors duration-500 group-hover:text-white/40">
                    Return to Base
                  </span>
                  <motion.div 
                    className="absolute -bottom-2 left-0 h-1 bg-white"
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                  />
                </Link>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer info */}
        <footer className="mt-auto flex flex-col md:flex-row justify-between items-end gap-4 opacity-20 text-[10px] font-black uppercase tracking-[0.2em]">
          <span>Security Protocol v9.42.0</span>
          <span>© 2026 BANKASSIST CORE SYSTEM</span>
          <span>Access Timestamp: {new Date().toLocaleTimeString()}</span>
        </footer>
      </div>

      {/* Extreme subtle organic grid overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-150" />
    </div>
  );
};

export default NotFound;
