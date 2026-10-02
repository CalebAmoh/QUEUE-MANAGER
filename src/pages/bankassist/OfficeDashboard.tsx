import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/services/bankassistApi";
import { socket } from "@/services/socket";
import { Ticket, Office } from "@/types/queue";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackgroundBeams } from "@/components/ui/background-beams";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, AlertTriangle, Bell, History, CheckCircle2, Users, Clock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function matchService(officeServices: string[], ticketServiceId?: string, ticketServiceName?: string): boolean {
  if (!officeServices || officeServices.length === 0) return true;
  if (!ticketServiceId && !ticketServiceName) return false;

  const normalize = (str: string) => 
    (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const normTicketId = normalize(ticketServiceId || '');
  const normTicketName = normalize(ticketServiceName || '');

  const aliasMap: Record<string, string[]> = {
    cash_withdrawal: ['cashwithdrawal', 'withdrawal', 'atmcash', 'chequewithdrawal', 'counterchequewithdrawal', 'emailwithdrawalinstruction', 'samedayreversal'],
    cash_deposit: ['cashdeposit', 'deposit', 'multicurrencydeposit'],
    check_deposits: ['chequedeposits', 'checkdeposits', 'chequedeposit', 'checkdeposit', 'cheque', 'countercheque'],
    fund_transfers: ['fundtransfers', 'fundtransfer', 'transfer', 'transfers'],
    bill_payments: ['billpayments', 'billpayment', 'payments', 'payment'],
    balance: ['balanceinquiry', 'balanceenquiry', 'balance'],
    statement_generation: ['statementgeneration', 'statement', 'statements'],
    account_updates: ['accountupdates', 'accountupdate'],
    fraud_reporting: ['fraudreporting', 'fraud'],
    pin_reset: ['pinreset', 'resetpin'],
    mfa_setup: ['mfasetup', 'mfa'],
  };

  const ticketAliases = [
    normTicketId,
    normTicketName,
    ...(aliasMap[ticketServiceId || ''] || []),
    ...(aliasMap[normTicketId] || []),
  ].filter(Boolean);

  return officeServices.some(officeService => {
    const normOfficeService = normalize(officeService);
    if (!normOfficeService) return false;

    return ticketAliases.some(alias => 
      alias === normOfficeService || 
      normOfficeService.includes(alias) || 
      alias.includes(normOfficeService)
    );
  });
}

export function isBranchMatch(ticketBranch?: string, currentBranch?: string): boolean {
  if (!ticketBranch || !currentBranch) return true;
  return ticketBranch.toLowerCase() === currentBranch.toLowerCase();
}

const TellerDashboard = () => {
  const params = new URLSearchParams(window.location.search);
  const branchId = params.get("branch_id") || "MAIN"; // Default to MAIN if not provided
  const servedBy = params.get("served_by");
  const [branchName, setBranchName] = useState<string>(branchId);

  useEffect(() => {
    if (!branchId) return;
    api.getBranchInfo(branchId)
      .then((res) => {
        if (res?.description) setBranchName(res.description);
      })
      .catch((err) => console.log("OfficeDashboard branch lookup error:", err));
  }, [branchId]);

  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [skippedTickets, setSkippedTickets] = useState<Ticket[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingInOfficeId, setLoggingInOfficeId] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Teller station creation states when no office exists
  const [confirmCreateStationOpen, setConfirmCreateStationOpen] = useState(false);
  const [createStationOpen, setCreateStationOpen] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newDeskNumber, setNewDeskNumber] = useState("");
  const [creatingStation, setCreatingStation] = useState(false);

  const officesRef = useRef(offices);

  const handleCreateStation = async () => {
    if (!newStationName.trim()) {
      toast.error("Station Name is required");
      return;
    }
    setCreatingStation(true);
    try {
      const createdOffice = await api.createOffice({
        name: newStationName.trim(),
        deskNumber: newDeskNumber.trim(),
        branch_id: branchId,
        occupiedBy: servedBy || undefined,
      });
      toast.success(`Station "${createdOffice.name}" created! Logging in...`);
      setCreateStationOpen(false);
      setSelectedOfficeId(createdOffice.id);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create station");
    } finally {
      setCreatingStation(false);
    }
  };

  useEffect(() => {
    officesRef.current = offices;
  }, [offices]);

  const selectedOffice = offices.find((o) => o.id === selectedOfficeId) || null;

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    try {
      const [allOffices, allTickets, skipped] = await Promise.all([
        api.getOffices(branchId),
        api.getTickets(branchId),
        api.getSkippedTickets(branchId),
      ]);
      setOffices(allOffices);
      setTickets(allTickets);
      setSkippedTickets(skipped);

      // Auto-login if current user already occupies an office
      if (!selectedOfficeId && servedBy) {
        const myOffice = allOffices.find(o => o.status !== "OFFLINE" && o.occupiedBy === servedBy);
        if (myOffice) {
          setSelectedOfficeId(myOffice.id);
        }
      }

      if (selectedOfficeId) {
        const myTicket = allTickets.find(
          (t) =>
            String(t.assignedOfficeId) === String(selectedOfficeId) &&
            (t.status === "CALLING" || t.status === "SERVING"),
        );
        setActiveTicket(myTicket || null);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, [selectedOfficeId, branchId, servedBy]);

  useEffect(() => {
    if (!branchId) return;
    socket.emit("join_branch", { branchId });
    fetchData();

    const handleTicketCreated = (newTicket: Ticket) => {
      fetchData();
      const myServices = officesRef.current.find(o => o.id === selectedOfficeId)?.services || [];
      if (matchService(myServices, newTicket.serviceId, newTicket.serviceName) && isBranchMatch(newTicket.branch_id, branchId)) {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(e => console.log("Audio play blocked/failed:", e));
      }
    };

    socket.on("ticket:created", handleTicketCreated);
    socket.on("ticket:updated", fetchData);
    socket.on("office:updated", fetchData);

    return () => {
      socket.off("ticket:created", handleTicketCreated);
      socket.off("ticket:updated", fetchData);
      socket.off("office:updated", fetchData);
    };
  }, [fetchData, branchId, selectedOfficeId]);

  const handleCallNext = async () => {
    if (!selectedOfficeId) return;
    setLoading(true);
    try {
      const waiting = await api.getWaitingTickets(branchId);
      if (waiting.length === 0) {
        toast.info("No pending tickets in queue");
        return;
      }
      
      // Filter tickets to match any service provided by this teller (or all tickets if no specific service restriction)
      const myServices = selectedOffice?.services || [];
      const eligibleTickets = waiting.filter(t => 
        isBranchMatch(t.branch_id, branchId) && 
        matchService(myServices, t.serviceId, t.serviceName)
      );
      
      if (eligibleTickets.length === 0) {
        toast.info("No pending tickets for your assigned services");
        return;
      }

      const ticket = await api.callTicket(eligibleTickets[0].id, selectedOfficeId, servedBy as string);
      setActiveTicket(ticket);
      toast.success(`Called ticket ${ticket.queueNumber}`);
    } catch (e) {
      toast.error("Failed to call next ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!activeTicket) return;
    setLoading(true);
    try {
      const ticket = await api.startService(activeTicket.id);
      setActiveTicket(ticket);
    } catch (e) {
      toast.error("Failed to start service");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeTicket || !servedBy) return;
    setLoading(true);
    try {
      await api.completeService(activeTicket.id, servedBy);
      setActiveTicket(null);
      toast.success("Service completed");
    } catch (e) {
      toast.error("Failed to complete");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!activeTicket) return;
    setLoading(true);
    try {
      await api.skipTicket(activeTicket.id);
      setActiveTicket(null);
      toast.info("Ticket put on hold");
      fetchData();
    } catch (e) {
      toast.error("Failed to put on hold");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeTicket || !servedBy) return;
    setLoading(true);
    try {
      // Complete service with CANCELLED status
      await api.cancelTicket(activeTicket.id, servedBy);
      setActiveTicket(null);
      toast.warning("Ticket cancelled - customer not served");
      fetchData();
    } catch (e) {
      toast.error("Failed to cancel ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async (ticketId: number) => {
    if (!selectedOfficeId || !servedBy) return;
    setLoading(true);
    try {
      const ticket = await api.callTicket(ticketId, selectedOfficeId, servedBy);
      setActiveTicket(ticket);
      toast.success(`Recalled ticket ${ticket.queueNumber}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to recall");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (checked: boolean) => {
    if (!selectedOfficeId) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = checked ? "AVAILABLE" : "OFFLINE";
      await api.updateOfficeStatus(
        selectedOfficeId,
        newStatus,
        checked ? servedBy : null
      );
      if (!checked) {
        toast.info("Station status set to Offline");
      } else {
        toast.success("Station status set to Available");
      }
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogin = async (officeId: number) => {
    if (isNaN(officeId)) return;
    // Double check occupancy before allowing login
    const office = offices.find(o => o.id === officeId);
    if (office?.status !== "OFFLINE" && office?.occupiedBy && office.occupiedBy !== servedBy) {
      toast.error(`This office is already in use by ${office.occupiedBy}`);
      return;
    }

    setLoggingInOfficeId(officeId);
    try {
      const updatedOffice = await api.updateOfficeStatus(officeId, "AVAILABLE", servedBy);
      setSelectedOfficeId(officeId);
      if (updatedOffice?.services && updatedOffice.services.length > 0) {
        toast.success(`Logged in to desk with ${updatedOffice.services.length} active teller service(s)`);
      } else {
        toast.success(`Logged in to desk`);
      }
      fetchData();
    } catch (e) {
      toast.error("Failed to login to office. Please select your desk again.");
    } finally {
      setLoggingInOfficeId(null);
    }
  };

  const handleLogout = useCallback(async (isAutoLogout = false) => {
    if (!selectedOfficeId) return;
    try {
      await api.updateOfficeStatus(selectedOfficeId, "OFFLINE", null);
      setSelectedOfficeId(null);
      if (isAutoLogout) {
        toast.warning("You have been logged out due to 30 minutes of inactivity.", {
          duration: 8000,
        });
      } else {
        toast.info("Logged out successfully");
      }
    } catch (e) {
      console.error("Failed to logout", e);
    }
  }, [selectedOfficeId]);

  // 30-minute Inactivity Auto-Logout Tracker
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const lastActivityRef = useRef<number>(Date.now());

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!selectedOfficeId) return;

    resetActivity();
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    
    let lastRecorded = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 1000) {
        lastRecorded = now;
        resetActivity();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        handleLogout(true);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInterval);
    };
  }, [selectedOfficeId, handleLogout, resetActivity]);

  // Login screen (modern card)
  if (!branchId || !servedBy) {
    return (
      <div className="relative flex h-screen items-center justify-center bg-background overflow-hidden font-urbanist">
        <BackgroundBeams />
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        <div className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur rounded-2xl shadow-xl space-y-6 flex flex-col items-center">
          <AlertTriangle className="w-16 h-16 text-caution mb-4" />
          <h1 className="text-3xl font-extrabold text-foreground text-center">
            Missing Parameters
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Please access this URL with both <span className="font-bold">?branch_id</span> and <span className="font-bold">?served_by</span> parameters.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedOfficeId) {
    return (
      <div className="relative flex h-screen items-center justify-center bg-background overflow-hidden font-urbanist">
        <BackgroundBeams />
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* Supervisor Unavailable Confirmation Modal */}
        <Dialog open={confirmCreateStationOpen} onOpenChange={setConfirmCreateStationOpen}>
          <DialogContent className="sm:max-w-[420px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Supervisor Unavailable?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-2 leading-relaxed">
                Station creation is strictly intended for cases where your branch supervisor is unavailable. Are you sure you want to proceed and create a new desk station for <span className="font-bold text-foreground">{branchName}</span>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-4 sm:gap-0">
              <Button variant="ghost" onClick={() => setConfirmCreateStationOpen(false)} className="h-10">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setConfirmCreateStationOpen(false);
                  if (!newStationName) setNewStationName(`${servedBy}'s Station`);
                  setCreateStationOpen(true);
                }}
                className="bg-primary font-bold h-10 px-5 shadow-lg shadow-primary/20"
              >
                Yes, Continue to Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Station Form Modal */}
        <Dialog open={createStationOpen} onOpenChange={setCreateStationOpen}>
          <DialogContent className="sm:max-w-[420px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create Desk Station
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Create a desk station for branch <span className="font-bold text-foreground">{branchName}</span>. Supervisors can edit station details on their page later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="stationName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Station Name</Label>
                <Input
                  id="stationName"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  placeholder={`e.g. ${servedBy}'s Station`}
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deskNo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Desk Number (Optional)</Label>
                <Input
                  id="deskNo"
                  value={newDeskNumber}
                  onChange={(e) => setNewDeskNumber(e.target.value)}
                  placeholder="e.g. Desk 1 or A1"
                  className="bg-background/50 border-border/50 h-10"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setCreateStationOpen(false)} className="h-10">Cancel</Button>
              <Button onClick={handleCreateStation} disabled={creatingStation} className="bg-primary font-bold h-10 px-6 shadow-lg shadow-primary/20">
                {creatingStation ? "Creating..." : "Create & Login"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loggingInOfficeId !== null ? (
          <div className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur rounded-2xl shadow-xl space-y-6 flex flex-col items-center border border-border/50">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin my-2" />
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Logging In...
              </h1>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Connecting desk station & linking teller services for <span className="font-bold text-primary">{servedBy}</span>.
              </p>
            </div>
          </div>
        ) : offices.length === 0 ? (
          <div className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur rounded-2xl shadow-xl space-y-6 flex flex-col items-center border border-border/50">
            <AlertTriangle className="w-14 h-14 text-amber-500/90 mb-1 animate-pulse" />
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                No Stations Created Yet
              </h1>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                No office stations have been created by the supervisor for branch <span className="font-bold text-foreground">{branchName}</span> yet.
              </p>
              <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
                Welcome, <span className="font-bold text-primary">{servedBy}</span>. If supervisor is unavailable, you can create a station now to log in and begin serving.
              </p>
            </div>

            <Button 
              onClick={() => {
                setConfirmCreateStationOpen(true);
              }}
              className="w-full font-bold bg-primary hover:bg-primary/90 h-11 text-sm shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Station (Supervisor Unavailable)
            </Button>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-md p-8 bg-card/90 backdrop-blur rounded-2xl shadow-xl space-y-6">
            <h1 className="text-3xl font-extrabold text-foreground text-center">
              Office Login
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Branch: <span className="font-bold text-foreground">{branchName}</span>. Welcome, <span className="font-bold text-primary">{servedBy}</span>. Select your desk to begin.
            </p>
            <div className="space-y-3">
              <Select onValueChange={(val) => {
                if (val === "CREATE_NEW") {
                  setConfirmCreateStationOpen(true);
                } else {
                  handleLogin(Number(val));
                }
              }}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Choose a desk" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {offices.map((o) => {
                    const isOccupied = o.status !== "OFFLINE" && !!o.occupiedBy && o.occupiedBy !== servedBy;
                    return (
                      <SelectItem key={o.id} value={String(o.id)} disabled={isOccupied as boolean}>
                        {o.name} {o.deskNumber ? `— ${o.deskNumber.toLowerCase().startsWith('desk') ? o.deskNumber : `Desk ${o.deskNumber}`}` : ""}
                        {o.status !== "OFFLINE" && o.occupiedBy ? ` (In use by ${o.occupiedBy})` : ""}
                      </SelectItem>
                    );
                  })}
                  <div className="my-1 border-t border-border/50" />
                  <SelectItem value="CREATE_NEW" className="font-bold text-xs text-primary/70 cursor-pointer hover:bg-primary/10">
                    + Create New Station (Supervisor Unavailable)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-background overflow-hidden font-urbanist">
      <BackgroundBeams />
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {selectedOffice?.name}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {selectedOffice?.deskNumber ? (
              <>
                {selectedOffice.deskNumber.toLowerCase().startsWith('desk') 
                  ? selectedOffice.deskNumber 
                  : `Desk ${selectedOffice.deskNumber}`} — {branchName}
              </>
            ) : (
              branchName
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isUpdatingStatus ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/60 border border-border/50 rounded-full animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-muted-foreground">Updating Status...</span>
            </div>
          ) : (
            <span
              className={`text-sm font-semibold ${
                selectedOffice?.status === "AVAILABLE"
                  ? "text-primary"
                  : "text-caution"
              }`}
            >
              {selectedOffice?.status}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedOffice?.status === "AVAILABLE"}
                  onCheckedChange={handleStatusToggle}
                  disabled={isUpdatingStatus}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isUpdatingStatus ? "Updating station status..." : "Toggle between Available and Offline"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleLogout(false)}
                className="h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Logout and return to desk selection</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
          {/* Primary action column (spans 2) */}
          <div className="lg:col-span-2 p-6 flex flex-col justify-center">
            {!activeTicket && (() => {
              const waitingTickets = tickets.filter(t => t.status === "PENDING" && isBranchMatch(t.branch_id, branchId));
              const myServices = selectedOffice?.services || [];
              const eligibleTickets = waitingTickets.filter(t => matchService(myServices, t.serviceId, t.serviceName));
              const isDisabled = loading || selectedOffice?.status === "OFFLINE" || eligibleTickets.length === 0;

              return (
                <div className="flex flex-col items-center gap-4 w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCallNext}
                        disabled={isDisabled}
                        className={`w-full h-20 text-2xl font-extrabold rounded-xl transition-all duration-300 ${
                          isDisabled 
                          ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed" 
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                        }`}
                      >
                        Call Next
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {eligibleTickets.length > 0 
                        ? "Fetch the next pending ticket from the queue" 
                        : "No waiting customers for your assigned services"}
                    </TooltipContent>
                  </Tooltip>
                  {eligibleTickets.length === 0 && selectedOffice?.status !== "OFFLINE" && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-bold text-muted-foreground/80 uppercase tracking-[0.2em] flex items-center gap-2"
                    >
                      <Bell className="w-3 h-3 opacity-80" />
                      Queue is empty for your services
                    </motion.p>
                  )}
                  {selectedOffice?.status === "OFFLINE" && (
                    <p className="text-xs font-bold text-caution/80 uppercase tracking-[0.2em]">
                      Status is Offline
                    </p>
                  )}
                </div>
              );
            })()}

            {activeTicket && (
              <div className="bg-card border border-border rounded-2xl p-8 space-y-8 mx-auto w-full max-w-lg">
                <div className="flex items-center justify-between">
                  <span className="text-8xl font-extrabold text-primary">
                    {activeTicket.queueNumber}
                  </span>
                  <span
                    className={`text-sm font-semibold px-4 py-1 rounded-full ${
                      activeTicket.status === "CALLING"
                        ? "bg-primary/20 text-primary"
                        : "bg-caution/20 text-caution"
                    }`}
                  >
                    {activeTicket.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-semibold text-foreground">
                      {activeTicket.customerName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service</p>
                    <p className="font-semibold text-foreground">
                      {activeTicket.serviceName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account</p>
                    <p className="font-semibold text-foreground">
                      {activeTicket.accountNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold text-foreground">
                      {activeTicket.amount !== null && activeTicket.amount !== undefined && !isNaN(parseFloat(String(activeTicket.amount)))
                        ? `${parseFloat(String(activeTicket.amount)).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  {activeTicket.status === "CALLING" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleStart}
                          disabled={loading}
                          className="flex-1 min-w-[9rem] bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                        >
                          Start Serving
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Begin serving this customer
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {activeTicket.status === "SERVING" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleComplete}
                          disabled={loading}
                          className="flex-1 min-w-[9rem] bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                        >
                          Complete
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Mark this service as completed
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleSkip}
                          disabled={loading}
                          variant="outline"
                          className="flex-1 border-caution text-caution hover:text-red-500 hover:bg-caution/10 rounded-lg"
                        >
                          Hold
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Put this ticket on hold
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleCancel}
                          disabled={loading}
                          variant="ghost"
                          className="flex-1 border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Cancel this ticket (customer left or cannot be served)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Skipped column */}
          <div className="border-l border-border flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
              <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-4">
                On Hold
              </h2>
            {skippedTickets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tickets on hold
              </p>
            )}
            <div className="space-y-3">
              {skippedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between bg-card rounded-md px-4 py-3 border border-border"
                >
                  <span className="font-bold text-caution">
                    {ticket.queueNumber}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecall(ticket.id)}
                        disabled={loading || !!activeTicket}
                        className="text-xs border-border text-foreground hover:bg-accent"
                      >
                        Recall
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Recall this ticket from hold</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer Stats */}
          <footer className="mt-auto py-4 px-6 border-t border-border bg-card/30 backdrop-blur-sm">
             <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-primary/10 rounded-xl px-5 py-4 border border-primary/20">
                   <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Your Queue</span>
                   <div className="flex items-baseline gap-1.5">
                     <span className="text-4xl font-black text-primary tabular-nums tracking-tighter drop-shadow-md">
                       {(() => {
                          const myServices = selectedOffice?.services || [];
                          return tickets.filter(t => 
                            t.status === "PENDING" && 
                            isBranchMatch(t.branch_id, branchId) && 
                            matchService(myServices, t.serviceId, t.serviceName)
                          ).length;
                       })()}
                     </span>
                     <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">customer(s)</span>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">You Served</span>
                   <span className="text-sm font-bold text-emerald-500 tabular-nums">
                     {tickets.filter(t => t.status === "COMPLETED" && String(t.assignedOfficeId) === String(selectedOfficeId)).length} completed
                   </span>
                </div>
             </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
  );
};

export default TellerDashboard;
