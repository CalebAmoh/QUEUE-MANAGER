import { useEffect, useRef, useState, useCallback } from "react";
import { api, getMediaBaseUrl } from "@/services/bankassistApi";
import { socket } from "@/services/socket";
import { Ticket, Office, Ad } from "@/types/queue";
import { SystemSettings } from "@/types/admin";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, AlertTriangle } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";

const DING_DONG_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const BigScreen = () => {
  const params = new URLSearchParams(window.location.search);
  const branchId = params.get("branch_id") || "MAIN"; // Default to MAIN if not provided
  const [branchName, setBranchName] = useState<string>(branchId);

  useEffect(() => {
    if (!branchId) return;
    api.getBranchInfo(branchId)
      .then((res) => {
        if (res?.description) setBranchName(res.description);
      })
      .catch((err) => console.log("BigScreen branch lookup fallback:", err));
  }, [branchId]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentLandscapeIndex, setCurrentLandscapeIndex] = useState(0);
  const [currentPortraitIndex, setCurrentPortraitIndex] = useState(0);
  const [flashingTicketId, setFlashingTicketId] = useState<number | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(DING_DONG_URL);
  }, []);

  const announceTicket = useCallback(
    (queueNumber: number, office: Office | undefined) => {
      if (!window.speechSynthesis) return;

      // Cancel any ongoing speech to avoid overlap
      window.speechSynthesis.cancel();

      const savedVoiceName = localStorage.getItem("bankassist_voice_name");
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) => v.name === savedVoiceName) || voices[0];

      const ticketStr = queueNumber.toString();
      let msg = `Now serving ticket number ${ticketStr}. `;
      if (office) {
        const deskStr = office.deskNumber 
          ? (office.deskNumber.toLowerCase().startsWith('desk') ? office.deskNumber : `Desk ${office.deskNumber}`)
          : "";
        msg += `Please proceed to ${office.name}${deskStr ? `, ${deskStr}` : ""}.`;
      }

      const utterance = new SpeechSynthesisUtterance(msg);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const fetchAds = useCallback(async () => {
    try {
      const allAds = await api.getAds();
      setAds(allAds);
      
      // Fetch settings
      const settingsRes = await fetch('/api/settings/public');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (e) {
      console.error("Fetch ads error:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    try {
      const [allTickets, allOffices] = await Promise.all([
        api.getTickets(branchId),
        api.getOffices(branchId),
      ]);
      setTickets(allTickets);
      setOffices(allOffices);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, [branchId]);

  const handleTicketCalled = useCallback(
    (ticket: Ticket) => {
      // Only process ticket calls for this branch
      if (ticket.branch_id && branchId && ticket.branch_id.toLowerCase() !== branchId.toLowerCase()) {
        return;
      }
      setFlashingTicketId(ticket.id);
      fetchData();

      audioRef.current?.play().catch(() => {});

      setTimeout(() => {
        setOffices((prevOffices) => {
          const office = prevOffices.find(
            (o) => String(o.id) === String(ticket.assignedOfficeId),
          );
          announceTicket(ticket.queueNumber, office);
          return prevOffices;
        });
      }, 1000);

      setTimeout(() => setFlashingTicketId(null), 5000);
    },
    [fetchData, announceTicket, branchId],
  );

  useEffect(() => {
    if (!branchId) return;
    socket.emit("join_branch", { branchId });
    fetchData();
    fetchAds();

    socket.on("ticket:called", handleTicketCalled);
    socket.on("ticket:created", fetchData);
    socket.on("ticket:updated", fetchData);
    socket.on("office:updated", fetchData);
    socket.on("ad:updated", fetchAds); // New event for ad changes

    return () => {
      socket.off("ticket:called", handleTicketCalled);
      socket.off("ticket:created", fetchData);
      socket.off("ticket:updated", fetchData);
      socket.off("office:updated", fetchData);
      socket.off("ad:updated", fetchAds);
    };
  }, [fetchData, fetchAds, handleTicketCalled, branchId]);

  const landscapeAds = ads.filter((ad) => ad.active && (ad.display_type || "").toLowerCase() === "landscape");
  const portraitAds = ads.filter((ad) => ad.active && (ad.display_type || "").toLowerCase() === "portrait");

  const showLandscape = settings?.adsEnabled && settings?.landscapeAdsEnabled;
  const showPortrait = settings?.adsEnabled && settings?.portraitAdsEnabled;

  // Ad rotation effect
  useEffect(() => {
    if (ads.length === 0) return;
    const interval = setInterval(() => {
      setCurrentLandscapeIndex((prev) =>
        landscapeAds.length ? (prev + 1) % landscapeAds.length : 0
      );
      setCurrentPortraitIndex((prev) =>
        portraitAds.length ? (prev + 1) % portraitAds.length : 0
      );
    }, 8000);
    return () => clearInterval(interval);
  }, [ads, landscapeAds.length, portraitAds.length]);

  const nowServing = tickets
    .filter((t) => (t.status === "CALLING" || t.status === "SERVING") && (!t.branch_id || t.branch_id.toLowerCase() === branchId.toLowerCase()))
    .sort((a, b) => {
      const aTime = a.calledAt || a.timestamp;
      const bTime = b.calledAt || b.timestamp;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 12);

  const waiting = tickets
    .filter((t) => t.status === "PENDING" && (!t.branch_id || t.branch_id.toLowerCase() === branchId.toLowerCase()))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .slice(0, 50);

  const isIdle =
    nowServing.length === 0 && waiting.length === 0 && landscapeAds.length > 0 && showLandscape;

  // helper for gallery sidebar markup – show one ad at a time with ambient backdrop
  const GallerySidebar = () => {
    const active = portraitAds[currentPortraitIndex];
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-black overflow-hidden relative">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
            >
              {active.type === "video" ? (
                <>
                  <video
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
                    muted
                    autoPlay
                    loop
                    playsInline
                    src={`${getMediaBaseUrl()}/${active.url}`}
                  />
                  <video
                    className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                    muted
                    autoPlay
                    loop
                    playsInline
                    src={`${getMediaBaseUrl()}/${active.url}`}
                  />
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none"
                    style={{
                      backgroundImage: `url(${getMediaBaseUrl()}/${active.url})`,
                    }}
                  />
                  <img
                    src={`${getMediaBaseUrl()}/${active.url}`}
                    alt={active.title}
                    className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                  />
                </>
              )}
            </motion.div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <p className="text-sm text-muted-foreground">
                No media available
              </p>
            </div>
          )}
        </AnimatePresence>
      </aside>
    );
  };

  const getOfficeDesk = (officeId: number | null) => {
    if (!officeId) return "—";
    const office = offices.find((o) => o.id === officeId);
    if (!office) return "—";
    const desk = office.deskNumber;
    return desk 
      ? (desk.toLowerCase().startsWith('desk') ? `${office.name} (${desk})` : `${office.name} (Desk ${desk})`)
      : office.name;
  };

  if (!branchId) {
    return (
      <div className="relative flex h-screen items-center justify-center bg-background overflow-hidden font-urbanist">
        <BackgroundBeams />
        <div className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur rounded-2xl shadow-xl flex flex-col items-center justify-center border border-border">
          <AlertTriangle className="w-16 h-16 text-caution mb-4" />
          <h1 className="text-3xl font-extrabold text-foreground text-center mb-2">
            Branch ID Required
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Set ?branch_id in the URL to show the big screen for this branch.
          </p>
        </div>
      </div>
    );
  }

  if (isIdle) {
    const activeAd = landscapeAds[currentLandscapeIndex];
    return (
      <div className="h-screen w-full bg-black overflow-hidden relative font-urbanist">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAd.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            {activeAd.type === "video" ? (
              <>
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
                  src={`${getMediaBaseUrl()}/${activeAd.url}`}
                />
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                  src={`${getMediaBaseUrl()}/${activeAd.url}`}
                />
              </>
            ) : (
              <>
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none"
                  style={{
                    backgroundImage: `url(${getMediaBaseUrl()}/${activeAd.url})`,
                  }}
                />
                <img
                  src={`${getMediaBaseUrl()}/${activeAd.url}`}
                  alt={activeAd.title}
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                />
              </>
            )}

          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-8 right-12 flex gap-2 z-20">
          {landscapeAds.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentLandscapeIndex ? "w-8 bg-primary" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-background overflow-hidden font-urbanist">
      <BackgroundBeams className="opacity-30" />
      <div className="relative z-10 flex-1 flex min-w-0">
        {/* Now Serving */}
        <div className="flex-1 flex flex-col p-8 border-r border-border min-w-0">
          <div className="flex items-center justify-between mb-8 bg-card py-2 px-6 rounded-xl border border-border">
            <h2 className="text-lg animate-pulse font-extrabold tracking-[0.2em] uppercase text-muted-foreground">
              Now Serving
            </h2>
            <span className="text-sm font-black px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
              Branch: {branchName}
            </span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {nowServing.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-2xl text-center flex flex-col items-center">
                  <span className="text-6xl mb-4">☕</span>
                  No active tickets
                </p>
              </div>
            )}
            {nowServing.length > 0 && (
              <div
                className={`grid ${
                  nowServing.length === 1
                    ? "grid-cols-1 place-items-center h-full gap-0"
                    : nowServing.length === 2
                      ? "grid-cols-1 grid-rows-2 gap-8"
                      : nowServing.length === 3
                        ? "grid-cols-1 grid-rows-3 gap-6"
                        : nowServing.length === 4
                          ? "grid-cols-2 grid-rows-2 gap-6"
                          : nowServing.length <= 6
                          ? "grid-cols-2 grid-rows-3 gap-6"
                          : nowServing.length <= 8
                            ? "grid-cols-2 grid-rows-4 gap-4"
                            : "grid-cols-3 grid-rows-4 gap-3"
                }`}
              >
                {nowServing.map((ticket) => {
                  const isFlashing = flashingTicketId === ticket.id;
                  const office = offices.find(o => String(o.id) === String(ticket.assignedOfficeId));
                  
                  const getTicketSize = () => {
                    if (nowServing.length === 1) return "text-9xl";
                    if (nowServing.length === 2) return "text-8xl";
                    if (nowServing.length === 3) return "text-7xl";
                    if (nowServing.length === 4) return "text-6xl";
                    return "text-5xl";
                  };
                  const getDeskSize = () => {
                    const activeCount = nowServing.length;
                    if (activeCount > 8) return "text-lg";
                    if (activeCount > 4) return "text-xl";
                    return "text-3xl";
                  };
                  const getPadding = () => {
                    if (nowServing.length === 1) return "p-8 w-full max-w-4xl";
                    if (nowServing.length === 2) return "p-6 w-full max-w-3xl";
                    if (nowServing.length === 3) return "p-5 w-full";
                    if (nowServing.length === 4) return "p-4";
                    return "p-3";
                  };
                  return (
                    <div
                      key={ticket.id}
                      className={`flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm ${getPadding()} ${
                        isFlashing ? "animate-ticket-flash" : ""
                      } ${
                        flashingTicketId && !isFlashing
                          ? "animate-fade-dim"
                          : "animate-fade-restore"
                      } transition-all duration-500 shadow-lg`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={`${getTicketSize()} font-black tracking-tighter leading-none ${
                            isFlashing || ticket.id === nowServing[0]?.id
                              ? "text-primary"
                              : "text-foreground"
                          } animate-blink`}
                        >
                          {ticket.queueNumber}
                        </span>
                        <span className="text-[10px] sm:text-xs font-black text-muted-foreground/50 uppercase tracking-[0.2em] mt-2 text-left ml-1 border-l-2 border-primary/20 pl-2 pr-2 leading-tight break-words line-clamp-2 max-w-full" title={ticket.serviceName}>
                          {ticket.serviceName}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-1 min-w-0">
                        <div className="flex flex-col items-end bg-background/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-border/30 shadow-inner w-full max-w-[280px] sm:max-w-none">
                          <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest mb-1">Proceed to</span>
                          <span className={`${getDeskSize()} font-black text-foreground leading-none truncate w-full text-right`} title={office?.name || ''}>
                            {office?.name || ''}
                          </span>
                          {office?.deskNumber && (
                            <span className="text-sm font-bold text-primary mt-1 truncate w-full text-right">
                              {office.deskNumber.toLowerCase().startsWith('desk') ? office.deskNumber.toUpperCase() : `DESK ${office.deskNumber}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Waiting */}
        <div className="w-[45%] flex flex-col p-8 bg-card/10 backdrop-blur-md border-l border-border/50 min-w-0">
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-6 text-center bg-card py-2 rounded-xl border border-border shadow-sm">
            Waiting List
          </h2>
          <div className="flex-1 overflow-hidden min-h-0">
            <div className="h-full overflow-y-auto scrollbar-none pr-1">
              <div 
                className={`grid content-start ${
                  waiting.length > 22 
                    ? "grid-cols-3 gap-x-4 gap-y-1" 
                    : waiting.length > 11 
                      ? "grid-cols-2 gap-x-6 gap-y-1.5" 
                      : "grid-cols-1 gap-x-8 gap-y-2.5"
                }`}
              >
                {waiting.length === 0 && (
                  <div className="col-span-full h-full flex flex-col justify-center items-center py-20">
                     <p className="text-muted-foreground text-xl">
                       No tickets waiting
                     </p>
                  </div>
                )}
                {waiting.map((ticket, i) => (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between border-b border-border/20 group hover:bg-card/30 rounded-lg transition-colors ${
                      waiting.length > 22 ? "py-1 px-1.5" : waiting.length > 11 ? "py-1.5 px-2" : "py-2 px-2.5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-muted-foreground/40 font-mono text-[10px] shrink-0">{i + 1}.</span>
                      <span className={`${waiting.length > 22 ? 'text-xl' : waiting.length > 11 ? 'text-2xl' : 'text-3xl'} font-bold text-foreground tracking-tighter shrink-0`}>
                        {ticket.queueNumber}
                      </span>
                    </div>
                    <span className={`${waiting.length > 22 ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} font-black text-black/60 dark:text-white/30 uppercase tracking-wider text-right leading-tight break-words line-clamp-2 pl-2 max-w-[110px] sm:max-w-[150px]`} title={ticket.serviceName}>
                      {ticket.serviceName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {portraitAds.length > 0 && showPortrait && <GallerySidebar />}
    </div>
  );
};

export default BigScreen;
