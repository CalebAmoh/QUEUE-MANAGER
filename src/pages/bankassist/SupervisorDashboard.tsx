import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, getMediaBaseUrl } from "@/services/bankassistApi";
import { socket } from "@/services/socket";
import { Ticket, Office, Ad } from "@/types/queue";
import { SystemSettings } from "@/types/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackgroundBeams } from "@/components/ui/background-beams";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Upload,
  Image as ImageIcon,
  Users,
  BarChart3,
  Clock,
  Mic,
  Eye,
  Settings2,
  AlertTriangle,
  Plus,
  Pencil,
  CheckCircle2,
  History as HistoryIcon,
  ChevronLeft,
  ChevronRight,
  Power,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
export function filterServiceLabels(services: any[]): string[] {
  if (!Array.isArray(services)) return [];
  const rawStrings = services.map((s) => String(s).trim()).filter(Boolean);
  
  // Check if we have descriptive labels (strings with spaces or > 5 chars)
  const hasDescriptiveLabels = rawStrings.some((s) => s.includes(' ') || s.length > 5);

  const cleanList: string[] = [];

  for (const s of rawStrings) {
    const isShortCode = /^[A-Z0-9]{2,5}$/.test(s);
    
    // Omit short uppercase codes (e.g. EMW, CADD, CAWW, CCQ) whenever descriptive labels are present
    if (isShortCode && hasDescriptiveLabels) {
      continue;
    }
    
    cleanList.push(s);
  }

  return Array.from(new Set(cleanList));
}

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const branchId = params.get("branch_id") || "MAIN"; // Default to MAIN if not provided
  const [branchName, setBranchName] = useState<string>(branchId);

  useEffect(() => {
    if (!branchId) return;
    api.getBranchInfo(branchId)
      .then(res => {
        if (res?.description) setBranchName(res.description);
      })
      .catch(e => console.log("Branch fetch fallback:", e));
  }, [branchId]);

  const [offices, setOffices] = useState<Office[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [availableServices, setAvailableServices] = useState<{ id: string; title: string }[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadAdType, setUploadAdType] = useState<'landscape' | 'portrait'>('landscape');

  // modal states
  const [createOfficeOpen, setCreateOfficeOpen] = useState(false);
  const [editOfficeOpen, setEditOfficeOpen] = useState(false);
  const [editOfficeName, setEditOfficeName] = useState("");
  const [editOfficeDesk, setEditOfficeDesk] = useState("");

  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeDesknumber, setNewOfficeDesknumber] = useState("");

  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [viewServicesOffice, setViewServicesOffice] = useState<Office | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    localStorage.getItem("bankassist_voice_name") || "",
  );

  // preview state for modal
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [updateAdDialogOpen, setUpdateAdDialogOpen] = useState(false);
  const [updateAdTypeSelection, setUpdateAdTypeSelection] = useState<'landscape' | 'portrait'>('landscape');

  const [replaceAdDialogOpen, setReplaceAdDialogOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [adToReplaceId, setAdToReplaceId] = useState<number | null>(null);

  const [mediaFilter, setMediaFilter] = useState<'all' | 'active' | 'inactive' | 'landscape' | 'portrait'>('all');
  
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;
  const [activityOpen, setActivityOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryCollapsed, setGalleryCollapsed] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const openPreview = (ad: Ad) => setPreviewAd(ad);

  const fetchAds = useCallback(async () => {
    try {
      const allAds = await api.getAds();
      setAds(allAds);
    } catch (e) {
      console.error("Fetch ads error:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [allOffices, allTickets, selfServicesRes, assistedServicesRes] = await Promise.allSettled([
        api.getOffices(branchId),
        api.getTickets(branchId),
        fetch('/api/services/self-service').then(res => res.json()),
        fetch('/api/services/assisted').then(res => res.json())
      ]);
      
      if (allOffices.status === 'fulfilled') setOffices(allOffices.value);
      if (allTickets.status === 'fulfilled') setTickets(allTickets.value);
      
      const selfServices = selfServicesRes.status === 'fulfilled' && Array.isArray(selfServicesRes.value) ? selfServicesRes.value : [];
      const assistedServices = assistedServicesRes.status === 'fulfilled' && Array.isArray(assistedServicesRes.value) ? assistedServicesRes.value : [];

      // Combine and unique by serviceId
      const uniqueServices = new Map();
      [...selfServices, ...assistedServices].forEach((s: { serviceId: string; title: string }) => {
        if (s && s.serviceId) {
          uniqueServices.set(s.serviceId, { id: s.serviceId, title: s.title });
        }
      });
      setAvailableServices(Array.from(uniqueServices.values()));
      
      // Fetch settings
      const settingsRes = await fetch('/api/settings/public');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, [branchId]);

  const handleCreateOffice = async () => {
    if (!branchId || !newOfficeName) {
      toast.error("Office Name is required");
      return;
    }
    
    try {
      await api.createOffice({
        name: newOfficeName,
        deskNumber: newOfficeDesknumber,
        branch_id: branchId,
        services: ["cash_withdrawal", "cash_deposit"] // default services
      });
      setCreateOfficeOpen(false);
      setNewOfficeName("");
      setNewOfficeDesknumber("");
      fetchData();
      toast.success("Office created successfully");
    } catch (err) {
      const errorMsg = 
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        (err as Error).message || 
        "Failed to create office";
      toast.error(errorMsg);
    }
  };


  const handleDeleteOffice = async (id: number) => {
    if (!confirm("Are you sure you want to delete this office? This action cannot be undone.")) return;
    try {
      await api.deleteOffice(id);
      fetchData();
      toast.success("Office deleted successfully");
    } catch (err) {
      const errorMsg = 
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        (err as Error).message || 
        "Failed to delete office";
      toast.error(errorMsg);
    }
  };

  const handleUpdateOffice = async () => {
    if (!selectedOffice || !editOfficeName) return;
    try {
      await api.updateOffice(selectedOffice.id, {
        name: editOfficeName,
        deskNumber: editOfficeDesk
      });
      setEditOfficeOpen(false);
      fetchData();
      toast.success("Office updated successfully");
    } catch (err) {
      const errorMsg = 
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        (err as Error).message || 
        "Failed to update office";
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    if (branchId) {
      socket.emit("join_branch", { branchId });
    }
    fetchData();
    fetchAds();

    socket.on("ticket:created", fetchData);
    socket.on("ticket:updated", fetchData);
    socket.on("office:updated", fetchData);

    return () => {
      socket.off("ticket:created", fetchData);
      socket.off("ticket:updated", fetchData);
      socket.off("office:updated", fetchData);
    };
  }, [fetchData, fetchAds, branchId]);

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (!selectedVoice && availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0].name);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedVoice]);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem("bankassist_voice_name", voiceName);

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Voice sample for queue announcements.");
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceName);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (ads.length >= 10) {
      setPendingUploadFile(file);
      setReplaceAdDialogOpen(true);
      return;
    }

    await proceedWithUpload(file);
  };

  const proceedWithUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.split(".")[0]);
    formData.append("type", file.type.startsWith("video") ? "video" : "image");
    formData.append("display_type", uploadAdType);

    setIsUploading(true);
    try {
      if (adToReplaceId !== null) {
        await api.deleteAd(adToReplaceId);
      }
      await api.uploadAd(formData);
      toast.success("Ad uploaded successfully");
      fetchAds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload ad");
    } finally {
      setIsUploading(false);
      setPendingUploadFile(null);
      setAdToReplaceId(null);
      setReplaceAdDialogOpen(false);
      // Reset input value so same file can be selected again if needed
      const input = document.getElementById('upload-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const handleUpdateAd = async () => {
    if (!selectedAd) return;
    try {
      await api.updateAd(selectedAd.id, updateAdTypeSelection);
      toast.success("Ad updated successfully");
      setUpdateAdDialogOpen(false);
      fetchAds();
    } catch (error) {
      toast.error("Failed to update ad");
    }
  };

  const handleToggleAdActive = async (id: number, currentActive: boolean) => {
    try {
      await api.toggleAdActive(id, !currentActive);
      toast.success(!currentActive ? "Ad activated & broadcasting" : "Ad paused / inactivated");
      fetchAds();
    } catch (error) {
      toast.error("Failed to update ad status");
    }
  };

  const handleDeleteAd = async (id: number) => {
    try {
      await api.deleteAd(id);
      toast.success("Ad deleted");
      fetchAds();
    } catch (error) {
      toast.error("Failed to delete ad");
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        toast.success("Display settings updated");
        socket.emit("ad:updated"); // Notify bigscreen
      }
    } catch (error) {
      toast.error("Failed to update display settings");
    }
  };

  const waiting = tickets.filter((t) => t.status === "PENDING").length;
  const serving = tickets.filter(
    (t) => t.status === "CALLING" || t.status === "SERVING",
  ).length;
  const served = tickets.filter((t) => t.status === "COMPLETED").length;

  const avgServiceTime = (() => {
    const completed = tickets.filter(
      (t) => t.status === "COMPLETED" && t.servedAt && t.completedAt,
    );
    if (completed.length === 0) return "—";
    const totalMs = completed.reduce((sum, t) => {
      return (
        sum +
        (new Date(t.completedAt!).getTime() - new Date(t.servedAt!).getTime())
      );
    }, 0);
    
    const avgSecTotal = Math.round(totalMs / completed.length / 1000);
    if (avgSecTotal < 60) return `${avgSecTotal}s`;
    
    const avgMin = Math.round(avgSecTotal / 60);
    if (avgMin >= 60) {
      const hours = Math.floor(avgMin / 60);
      const mins = avgMin % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${avgMin}m`;
  })();

  const getOfficeDesk = (officeId: number) => {
    const office = offices.find(o => o.id === officeId);
    if (!office) return "—";
    return office.deskNumber ? (office.deskNumber.toLowerCase().startsWith('desk') ? office.deskNumber : `Desk ${office.deskNumber}`) : office.name;
  };

  const recentTickets = [...tickets]
    .filter(t => t.status === "COMPLETED" || t.status === "SERVING")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const statusColor = (s: string) => {
    if (s === "AVAILABLE")
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    if (s === "BUSY")
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    return "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  };

  return (
    <div className="relative h-screen bg-background flex flex-col overflow-hidden font-urbanist">
      <BackgroundBeams />
      {/* ── Header ── */}
      <header className="relative z-10 shrink-0 flex items-center justify-between px-6 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            Supervisor Dashboard <span className="text-sm font-semibold text-muted-foreground">— {branchName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={selectedVoice} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-44 h-7 text-[10px] bg-background border-border">
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem
                    key={v.name}
                    value={v.name}
                    className="text-[10px]"
                  >
                    {v.name} ({v.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[12px] gap-1.5 font-bold hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
              onClick={() => setActivityOpen(true)}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Activity</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1.5 font-bold hover:bg-primary/10 hover:text-primary transition-all rounded-lg xl:hidden"
              onClick={() => setGalleryOpen(true)}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Media</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* main dashboard area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
            {[
              {
                icon: Users,
                label: "Waiting",
                value: waiting,
                color: "text-blue-500",
                bg: "bg-blue-500/5",
                border: "border-blue-500/20",
              },
              {
                icon: BarChart3,
                label: "Serving",
                value: serving,
                color: "text-amber-500",
                bg: "bg-amber-500/5",
                border: "border-amber-500/20",
              },
              {
                icon: CheckCircle2,
                label: "Served",
                value: served,
                color: "text-emerald-500",
                bg: "bg-emerald-500/5",
                border: "border-emerald-500/20",
              },
              {
                icon: Clock,
                label: "Avg Time",
                value: avgServiceTime,
                color: "text-violet-500",
                bg: "bg-violet-500/5",
                border: "border-violet-500/20",
              },
            ].map((m, idx) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center justify-between p-6 py-3 rounded-2xl bg-card/40 backdrop-blur-md border ${m.border} transition-all duration-300 hover:bg-card/60`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${m.bg} ${m.color}`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-black uppercase tracking-[0.2em] text-zinc-600 opacity-100">
                      {m.label}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-foreground tabular-nums leading-none">
                        {m.value}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Office stations list ── */}
          <div className="px-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between py-2 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-[15px] font-black tracking-[0.2em] uppercase text-zinc-600 opacity-100">
                  Office Configurations
                </h2>
                <span className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest mt-0.5">
                  Page {currentPage + 1} of {Math.max(1, Math.ceil(offices.length / itemsPerPage))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {offices.length > itemsPerPage && (
                  <div className="flex items-center bg-card/40 border border-border/40 rounded-xl p-0.5 mr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      disabled={(currentPage + 1) * itemsPerPage >= offices.length}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {branchId && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-2 font-bold px-4 rounded-xl border-border/50 bg-background/50 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all" onClick={() => setCreateOfficeOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Station
                  </Button>
                )}
              </div>
            </div>
            
            {/* Empty State for missing Branch ID */}
            {!branchId && (
              <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-lg text-center">
                <AlertTriangle className="w-12 h-12 text-caution mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">Branch ID Required</h3>
                <p className="text-sm text-muted-foreground/80 w-full max-w-sm">
                  Please access this URL with a valid ?branch_id parameter (e.g., ?branch_id=MAIN) to view and configure offices.
                </p>
              </div>
            )}

            {branchId && offices.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-lg text-center">
                <p className="text-sm text-muted-foreground/80 mb-4">
                  No offices configured for this branch ({branchId}).
                </p>
                <Button size="sm" onClick={() => setCreateOfficeOpen(true)}>Create Office</Button>
              </div>
            )}

            {branchId && offices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 overflow-hidden">
                {offices
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((office) => {
                const ticket = tickets.find(
                  (t) =>
                    t.assignedOfficeId === office.id &&
                    (t.status === "CALLING" || t.status === "SERVING"),
                );
                return (
                  <motion.div
                    key={office.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col bg-card/40 backdrop-blur-md border border-border/40 rounded-3xl overflow-hidden hover:border-primary/30 transition-all duration-300 group"
                  >
                    {/* Top Section: Info */}
                    <div className="p-4 space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                              office.status === "AVAILABLE" ? "bg-emerald-400 animate-pulse" : 
                              office.status === "OFFLINE" ? "bg-zinc-600" : "bg-amber-400"
                           }`} />
                            <span className={`text-[10px] font-black tracking-widest uppercase ${
                               office.status === "AVAILABLE" ? "text-emerald-500" : 
                               office.status === "OFFLINE" ? "text-zinc-500" : "text-amber-500"
                            }`}>
                              {office.status}
                            </span>
                        </div>
                        {ticket && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                            <span className="text-[9px] font-black text-primary uppercase">#{ticket.queueNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="text-base font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors" title={office.name}>
                          {office.name}
                        </h3>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider opacity-100">
                           {office.deskNumber 
                            ? (office.deskNumber.toLowerCase().startsWith('desk') 
                                ? office.deskNumber 
                                : `Desk ${office.deskNumber}`) 
                            : 'Unassigned'}
                        </p>
                      </div>

                      {(() => {
                        const cleanServices = filterServiceLabels(office.services || []);
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                             {cleanServices.slice(0, 2).map((s) => (
                               <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-muted/60 border border-border/40 text-foreground/90 whitespace-nowrap truncate max-w-[140px]" title={s}>
                                 {s}
                               </span>
                             ))}
                             {cleanServices.length > 2 && (
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setViewServicesOffice(office);
                                 }}
                                 className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-sm"
                                 title="Click to view all teller services for this station"
                               >
                                 +{cleanServices.length - 2}
                               </button>
                             )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom Section: Actions */}
                    <div className="px-3 py-2 bg-background/20 border-t border-border/40 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-0.5">
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all p-0"
                                onClick={() => {
                                  setSelectedOffice(office);
                                  setEditOfficeName(office.name);
                                  setEditOfficeDesk(office.deskNumber);
                                  setEditOfficeOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Station</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all p-0"
                                onClick={() => handleDeleteOffice(office.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>

                        <Select
                          value={office.status}
                          onValueChange={async (val: Office["status"]) => {
                            try {
                              await api.updateOfficeStatus(office.id, val);
                              fetchData();
                            } catch (e) {
                              console.error("Failed to update office status");
                            }
                          }}
                        >
                          <SelectTrigger
                            className="w-[100px] h-7 text-[9px] font-black px-3 rounded-lg border-border/40 bg-background/40 hover:bg-background/60 transition-all uppercase tracking-widest ring-0"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border backdrop-blur-xl">
                            <SelectItem value="AVAILABLE" className="text-[9px] font-bold text-emerald-400">AVAILABLE</SelectItem>
                            <SelectItem value="SERVING" className="text-[9px] font-bold text-amber-400">SERVING</SelectItem>
                            <SelectItem value="OFFLINE" className="text-[9px] font-bold text-muted-foreground">OFFLINE</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Gallery Sidebar Helper ── */}
      {(() => {
        const galleryContent = (
          <div className="flex flex-col h-full bg-card/5 backdrop-blur-md overflow-hidden xl:border-l xl:border-border">
            <div className="p-5 border-b border-border/40 bg-background/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-black tracking-[0.2em] uppercase text-muted-foreground/100 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Media Gallery
                  <span className="text-[10px] font-bold opacity-90 normal-case ml-1">({ads.length}/10)</span>
                </h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isUploading}
                      className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border backdrop-blur-xl">
                    <DropdownMenuItem className="text-[10px] font-bold" onSelect={() => {
                      setUploadAdType('landscape');
                      document.getElementById('upload-input')?.click();
                    }}>
                      Landscape Ad
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[10px] font-bold" onSelect={() => {
                      setUploadAdType('portrait');
                      document.getElementById('upload-input')?.click();
                    }}>
                      Portrait Ad
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input
                  id="upload-input"
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleUpload}
                />
              </div>

              {/* Ad Toggles */}
              {settings && (
                <div className="mb-4 p-3 rounded-xl bg-background/40 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Master Ads Switch</span>
                    <Switch 
                      checked={settings.adsEnabled} 
                      onCheckedChange={(v) => handleToggleSetting('adsEnabled', v)} 
                      className="scale-75"
                    />
                  </div>
                  <Separator className="opacity-20" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">Portrait Only</span>
                    <Switch 
                      checked={settings.portraitAdsEnabled} 
                      onCheckedChange={(v) => handleToggleSetting('portraitAdsEnabled', v)} 
                      disabled={!settings.adsEnabled}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">Landscape Only</span>
                    <Switch 
                      checked={settings.landscapeAdsEnabled} 
                      onCheckedChange={(v) => handleToggleSetting('landscapeAdsEnabled', v)} 
                      disabled={!settings.adsEnabled}
                      className="scale-75"
                    />
                  </div>
                </div>
              )}
              
              <Select value={mediaFilter} onValueChange={(val: 'all' | 'active' | 'inactive' | 'landscape' | 'portrait') => setMediaFilter(val)}>
                <SelectTrigger className="w-full h-8 text-[12px] font-black bg-background/40 border-border/40 hover:bg-background/60 transition-all uppercase tracking-widest ring-0">
                  <SelectValue placeholder="All media" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border backdrop-blur-xl">
                  <SelectItem value="all" className="text-[13px] font-bold">ALL MEDIA</SelectItem>
                  <SelectItem value="active" className="text-[13px] font-bold text-emerald-500">ACTIVE ONLY</SelectItem>
                  <SelectItem value="inactive" className="text-[13px] font-bold text-amber-500">INACTIVE / PAUSED</SelectItem>
                  <SelectItem value="landscape" className="text-[13px] font-bold">LANDSCAPE ONLY</SelectItem>
                  <SelectItem value="portrait" className="text-[13px] font-bold">PORTRAIT ONLY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {ads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                   <ImageIcon className="w-10 h-10 mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Empty</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {ads
                  .filter(ad => {
                    if (mediaFilter === 'all') return true;
                    if (mediaFilter === 'active') return ad.active;
                    if (mediaFilter === 'inactive') return !ad.active;
                    return (ad.display_type || "").toLowerCase() === mediaFilter;
                  })
                  .map((ad) => (
                    <div key={ad.id} className={`group relative aspect-video rounded-2xl overflow-hidden border shadow-sm bg-background/40 transition-all ${
                      ad.active ? 'border-border/40 hover:border-primary/50' : 'border-dashed border-border/70 opacity-60 hover:opacity-100'
                    }`}>
                      {ad.type === "video" ? (
                        <video className="w-full h-full object-cover">
                          <source src={getMediaBaseUrl() + (ad.url.startsWith('/') ? '' : '/') + ad.url} />
                        </video>
                      ) : (
                        <img src={getMediaBaseUrl() + (ad.url.startsWith('/') ? '' : '/') + ad.url} alt={ad.title} className="w-full h-full object-cover" />
                      )}

                      {/* Top Badges */}
                      <div className="absolute inset-x-0 top-0 p-2.5 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                        <Badge 
                          variant="outline" 
                          className={`text-[8px] font-black px-2 py-0.5 uppercase tracking-wider backdrop-blur-md cursor-pointer ${
                            ad.active 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                              : 'bg-zinc-800/80 text-zinc-300 border-zinc-600'
                          }`}
                          onClick={() => handleToggleAdActive(ad.id, ad.active)}
                          title="Click to toggle active status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ad.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                          {ad.active ? 'ACTIVE' : 'PAUSED'}
                        </Badge>
                        <span className="text-[8px] font-bold uppercase text-white/70 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                          {ad.display_type}
                        </span>
                      </div>

                      {/* Bottom Controls */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 flex items-center justify-between z-10">
                        <span className="text-[9px] font-black uppercase text-white/90 tracking-wider truncate max-w-[100px]" title={ad.title}>
                          {ad.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Toggle Active Status */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className={`h-7 w-7 p-0 rounded-lg backdrop-blur-md shadow-sm border transition-all ${
                                  ad.active 
                                    ? 'bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 border-emerald-400/40' 
                                    : 'bg-white/10 hover:bg-white/30 text-white/60 hover:text-white border-white/20'
                                }`} 
                                onClick={() => handleToggleAdActive(ad.id, ad.active)}
                              >
                                {ad.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">
                              {ad.active ? "Pause / Inactivate Ad" : "Activate Ad"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="secondary" className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md shadow-sm border border-white/20" onClick={() => openPreview(ad)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">Preview</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md shadow-sm border border-white/20" 
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setUpdateAdTypeSelection(ad.display_type);
                                  setUpdateAdDialogOpen(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">Update Layout</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="destructive" className="h-7 w-7 p-0 rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-sm border border-red-400/30" onClick={() => handleDeleteAd(ad.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-bold">Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        );

        return (
          <>
            <aside className={`hidden xl:flex ${galleryCollapsed ? 'w-12' : 'w-80'} shrink-0 flex-col transition-all duration-300 relative`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-50 h-6 w-6 rounded-full bg-card border border-border shadow-md hover:bg-primary hover:text-white transition-all"
                onClick={() => setGalleryCollapsed(!galleryCollapsed)}
              >
                {galleryCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              <div className={`${galleryCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'} h-full transition-opacity duration-300`}>
                {galleryContent}
              </div>
            </aside>
            <Sheet open={galleryOpen} onOpenChange={setGalleryOpen}>
              <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-card/95 backdrop-blur-xl border-l border-border/40">
                <SheetHeader className="sr-only">
                  <SheetTitle>Media Gallery</SheetTitle>
                  <SheetDescription>Manage advertisements and media content.</SheetDescription>
                </SheetHeader>
                {galleryContent}
              </SheetContent>
            </Sheet>
          </>
        );
      })()}



        {/* ── Recent Activity Sheet (Drawer) ── */}
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetContent className="w-full sm:max-w-md p-0 bg-card/95 backdrop-blur-xl border-l border-border/40 overflow-hidden flex flex-col">
            <SheetHeader className="p-6 border-b border-border/40 bg-background/20">
              <SheetTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <HistoryIcon className="w-5 h-5" />
                </div>
                Recent Activity
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Viewing latest {recentTickets.length} status updates
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {recentTickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                   <HistoryIcon className="w-12 h-12 mb-4" />
                   <p className="text-sm font-black uppercase tracking-widest">No Activity Records</p>
                </div>
              )}
              {recentTickets.map((ticket, idx) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-4 bg-background/40 border border-border/40 rounded-2xl hover:border-primary/20 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      {ticket.queueNumber.toString().padStart(3, "0")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground truncate">
                        {ticket.serviceName}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground/50 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                     <span className="text-[10px] font-black uppercase tracking-tighter text-primary/70">
                       {getOfficeDesk(ticket.assignedOfficeId || 0)}
                     </span>
                     <Badge variant="outline" className={`text-[8px] font-black h-5 px-2 border-emerald-500/20 text-emerald-500 bg-emerald-500/5 ${ticket.status === 'SERVING' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : ''}`}>
                       {ticket.status}
                     </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        {/* full-size preview dialog */}
        <Dialog
          open={!!previewAd}
          onOpenChange={(open) => {
            if (!open) setPreviewAd(null);
          }}
        >
          <DialogContent className="p-0 bg-black max-w-4xl w-full" aria-describedby={undefined}>
            <DialogHeader className="sr-only">
              <DialogTitle>Ad Preview</DialogTitle>
            </DialogHeader>
            {previewAd &&
              (previewAd.type === "video" ? (
                <video
                  src={`${getMediaBaseUrl()}/${previewAd.url}`}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              ) : (
                <img
                  src={`${getMediaBaseUrl()}/${previewAd.url}`}
                  alt={previewAd.title}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              ))}
          </DialogContent>
        </Dialog>

        {/* Update Ad Dialog */}
        <Dialog open={updateAdDialogOpen} onOpenChange={setUpdateAdDialogOpen}>
          <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Update Media Layout</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Change the display orientation for this media item.</DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Orientation</Label>
              <div className="grid grid-cols-2 gap-3">
                 <Button 
                   variant={updateAdTypeSelection === 'landscape' ? 'default' : 'outline'} 
                   className="h-12 font-bold"
                   onClick={() => setUpdateAdTypeSelection('landscape')}
                 >
                   Landscape
                 </Button>
                 <Button 
                   variant={updateAdTypeSelection === 'portrait' ? 'default' : 'outline'} 
                   className="h-12 font-bold"
                   onClick={() => setUpdateAdTypeSelection('portrait')}
                 >
                   Portrait
                 </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setUpdateAdDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateAd} className="bg-primary font-bold px-6">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Services Modal */}
        <Dialog open={!!viewServicesOffice} onOpenChange={() => setViewServicesOffice(null)}>
          <DialogContent className="sm:max-w-[450px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Teller Services — {viewServicesOffice?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Active Teller: <span className="font-bold text-primary">{viewServicesOffice?.occupiedBy || 'Unassigned / Offline'}</span> ({viewServicesOffice?.deskNumber ? (viewServicesOffice.deskNumber.toLowerCase().startsWith('desk') ? viewServicesOffice.deskNumber : `Desk ${viewServicesOffice.deskNumber}`) : 'Station'})
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const cleanModalServices = filterServiceLabels(viewServicesOffice?.services || []);
              return (
                <div className="py-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Authorized Teller Services ({cleanModalServices.length})
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {cleanModalServices.length > 0 ? (
                      cleanModalServices.map((s) => (
                        <Badge key={s} variant="secondary" className="px-3 py-1.5 text-xs font-bold bg-primary/10 border border-primary/20 text-primary rounded-xl">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs font-medium text-muted-foreground italic">
                        No active services linked to this station yet. Log in as a teller to fetch user services automatically.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => setViewServicesOffice(null)} className="h-9 px-6 font-bold bg-primary">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Office Dialog */}
        <Dialog open={createOfficeOpen} onOpenChange={setCreateOfficeOpen}>
          <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Create New Office</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Add a new station to this branch.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Office Name</Label>
                <Input
                  id="name"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="e.g. Teller 1"
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desk" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Desk Number (Optional)</Label>
                <Input
                  id="desk"
                  value={newOfficeDesknumber}
                  onChange={(e) => setNewOfficeDesknumber(e.target.value)}
                  placeholder="e.g. A1"
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setCreateOfficeOpen(false)} className="h-10">Cancel</Button>
              <Button onClick={handleCreateOffice} className="bg-primary h-10 px-6 font-bold shadow-lg shadow-primary/20">Create Office</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replace Ad Dialog */}
        <Dialog open={replaceAdDialogOpen} onOpenChange={(open) => {
          setReplaceAdDialogOpen(open);
          if (!open) {
            setPendingUploadFile(null);
            setAdToReplaceId(null);
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Storage Full (10/10)</DialogTitle>
              <DialogDescription>Please select an existing ad to replace.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto p-1 py-2">
              {ads.map(ad => (
                <div 
                  key={ad.id} 
                  className={`group relative aspect-video rounded-lg overflow-hidden border cursor-pointer border-border/40 transition-all ${adToReplaceId === ad.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:border-primary/50'}`}
                  onClick={() => setAdToReplaceId(ad.id)}
                >
                  {ad.type === "video" ? (
                    <video className="w-full h-full object-cover">
                      <source src={getMediaBaseUrl() + (ad.url.startsWith('/') ? '' : '/') + ad.url} />
                    </video>
                  ) : (
                    <img src={getMediaBaseUrl() + (ad.url.startsWith('/') ? '' : '/') + ad.url} alt={ad.title} className="w-full h-full object-cover" />
                  )}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${adToReplaceId === ad.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <span className="text-[10px] font-bold text-white text-center px-2 truncate w-full">{ad.title}</span>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReplaceAdDialogOpen(false)}>Cancel</Button>
              <Button disabled={!adToReplaceId || isUploading} onClick={() => proceedWithUpload(pendingUploadFile!)}>
                {isUploading ? "Replacing..." : "Replace Selected"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Office Dialog */}
        <Dialog open={editOfficeOpen} onOpenChange={setEditOfficeOpen}>
          <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Edit Office Details</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Update the name or desk number of this station.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Office Name</Label>
                <Input
                  id="edit-name"
                  value={editOfficeName}
                  onChange={(e) => setEditOfficeName(e.target.value)}
                  placeholder="e.g. Teller 1"
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-desk" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Desk Number</Label>
                <Input
                  id="edit-desk"
                  value={editOfficeDesk}
                  onChange={(e) => setEditOfficeDesk(e.target.value)}
                  placeholder="e.g. A1"
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setEditOfficeOpen(false)} className="h-10">Cancel</Button>
              <Button onClick={handleUpdateOffice} className="bg-primary h-10 px-6 font-bold shadow-lg shadow-primary/20">Update Office</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
