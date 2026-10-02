import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { motion } from "framer-motion";
import { Monitor, UserCircle, ShieldCheck } from "lucide-react";

const Index = () => {
  const views = [
    {
      label: "Public Display",
      path: "/queue/screen?branch_id=MAIN",
      icon: Monitor,
      color: "from-blue-600 to-cyan-500",
      shadow: "shadow-blue-500/20",
      tag: "Big Screen",
      desc: "Real-time queue tracking for customers",
    },
    {
      label: "Teller Panel",
      path: "/queue/office?branch_id=MAIN&served_by=TELLER_01",
      icon: UserCircle,
      color: "from-indigo-600 to-purple-500",
      shadow: "shadow-indigo-500/20",
      tag: "Staff Access",
      desc: "Smart desk management & service controls",
    },
    {
      label: "Command Center",
      path: "/queue/supervisor?branch_id=MAIN",
      icon: ShieldCheck,
      color: "from-emerald-600 to-teal-500",
      shadow: "shadow-emerald-500/20",
      tag: "Admin Only",
      desc: "Global monitoring & resource allocation",
    },
  ];

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-background text-foreground overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <BackgroundBeams />
      </div>

      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      <div className="max-w-6xl w-full h-full px-6 py-4 flex flex-col items-center justify-around relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="text-center mt-2 max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-3 py-1 pt-0 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md mb-2"
          >
            <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-primary leading-none">
              NextGen Queue System
            </span>
          </motion.div>
          <h1 className="text-4xl lg:text-5xl font-light tracking-tight mb-2 leading-none">
            Bank<span className="font-black text-foreground">Assist</span>
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base font-light leading-snug px-4">
            Optimizing floor experience with{" "}
            <span className="text-foreground font-normal">
              intelligent orchestration
            </span>
            .
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full max-w-5xl my-4">
          {views.map((view, i) => (
            <motion.div
              key={view.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
              className="relative group h-full"
            >
              <Link to={view.path} className="block h-full">
                <div className="relative h-full flex flex-col items-center p-5 lg:p-7 rounded-[30px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl transition-all duration-500 group-hover:bg-white/[0.05] group-hover:border-white/10 group-hover:translate-y-[-4px]">
                  {/* The Creative Circle Badge */}
                  <div className="relative mb-4 lg:mb-6">
                    <div
                      className={`absolute inset-[-10px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl bg-gradient-to-tr ${view.color} opacity-20`}
                    />
                    <div
                      className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-white bg-gradient-to-tr shadow-2xl transition-all duration-500 group-hover:scale-105 ${view.color} ${view.shadow}`}
                    >
                      <view.icon
                        strokeWidth={1.5}
                        className="w-8 h-8 lg:w-10 lg:h-10 transition-transform duration-500 group-hover:rotate-6"
                      />
                    </div>
                  </div>

                  <div className="text-center mt-auto">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500/80 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300 mb-1 block">
                      {view.tag}
                    </span>
                    <h3 className="text-lg lg:text-xl font-bold tracking-tight text-black dark:text-white mb-1">
                      {view.label}
                    </h3>
                    <p className="text-[11px] lg:text-xs text-slate-500 font-medium leading-tight group-hover:text-slate-400 transition-colors line-clamp-2">
                      {view.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mb-2 pt-4 border-t border-white/5 w-full flex justify-center"
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600/80">
            Secure Enterprise Gateway{" "}
            <span className="mx-2 text-slate-800">|</span> v2.4.0
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
