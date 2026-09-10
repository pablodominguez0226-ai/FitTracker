import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Dumbbell,
  Flame,
  Loader2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scale,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import Header from "../components/Header";
import {
  AUTH_USER_KEY,
  createBattle,
  finishBattle,
  getBattle,
  getExercises,
  joinBattle,
  saveBattleToWorkout,
  submitBattleRound,
  validateBattleRound,
} from "../api/client";

function playChime(success = false) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const freq = success ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37];
    const now = ctx.currentTime;
    freq.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.1);
      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.45);
    });
  } catch (e) {
    // ignore
  }
}

export default function LiveBattle() {
  const navigate = useNavigate();

  // Current logged in user info
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'join'
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active battle state
  const [battle, setBattle] = useState(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [pollingError, setPollingError] = useState(null);

  // Create battle form
  const [createExerciseId, setCreateExerciseId] = useState("");
  const [createUserName, setCreateUserName] = useState(currentUser?.username || "Atleta 1");
  const [createBodyweight, setCreateBodyweight] = useState("75");
  const [createRounds, setCreateRounds] = useState(3);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Join battle form
  const [joinPin, setJoinPin] = useState("");
  const [joinUserName, setJoinUserName] = useState(
    currentUser?.username ? `${currentUser.username}_rival` : "Rival"
  );
  const [joinBodyweight, setJoinBodyweight] = useState("80");
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);

  // Round submission (Lifter)
  const [liftWeight, setLiftWeight] = useState("60");
  const [liftReps, setLiftReps] = useState("10");
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);

  // Round validation (Validator)
  const [cleanRepsInput, setCleanRepsInput] = useState("");
  const [isValidatingRound, setIsValidatingRound] = useState(false);

  // Saving sets to workout
  const [savedWorkoutMsg, setSavedWorkoutMsg] = useState(null);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  // Current local user name participating in this battle
  const [myParticipantName, setMyParticipantName] = useState(() => {
    try {
      return localStorage.getItem("fittracker_battle_user") || currentUser?.username || "Atleta";
    } catch {
      return currentUser?.username || "Atleta";
    }
  });

  const pollIntervalRef = useRef(null);

  // Load initial exercise list
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const exList = await getExercises();
        setExercises(exList);
        if (exList.length > 0) {
          setCreateExerciseId(String(exList[0].id));
        }

        // Restore active battle from localStorage if any
        let savedBattleId = null;
        try {
          savedBattleId = localStorage.getItem("fittracker_active_battle_id");
        } catch {
          savedBattleId = null;
        }

        if (savedBattleId) {
          try {
            const data = await getBattle(Number(savedBattleId));
            setBattle(data);
          } catch {
            try {
              localStorage.removeItem("fittracker_active_battle_id");
            } catch {}
          }
        }
      } catch (err) {
        console.error("Error cargando ejercicios para duelo:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Poll battle updates every 1.5s when active
  useEffect(() => {
    if (!battle?.id || battle.status === "finished") {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const updated = await getBattle(battle.id);
        setBattle(updated);
        setPollingError(null);

        // Notify with vibration on turn change if it's my turn
        if (
          updated.status === "in_progress" &&
          updated.current_turn_user_name?.toLowerCase() === myParticipantName.toLowerCase() &&
          battle.current_turn_user_name?.toLowerCase() !== myParticipantName.toLowerCase()
        ) {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([100, 50, 100]);
            } catch (e) {}
          }
          playChime(false);
        }
      } catch (err) {
        console.warn("Polling error:", err);
        setPollingError("Reconectando...");
      }
    }, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [battle?.id, battle?.status, battle?.current_turn_user_name, myParticipantName]);

  // Handle Create Battle
  const handleCreate = async (e) => {
    e.preventDefault();
    const bw = parseFloat(createBodyweight);
    if (!createExerciseId || !createUserName.trim() || !bw || bw <= 0) {
      alert("Por favor completa el ejercicio, tu nombre y tu peso corporal en kg.");
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const data = await createBattle({
        exercise_id: Number(createExerciseId),
        user_name: createUserName.trim(),
        bodyweight: bw,
        target_rounds: Number(createRounds),
      });

      setBattle(data);
      setMyParticipantName(createUserName.trim());
      localStorage.setItem("fittracker_battle_user", createUserName.trim());
      localStorage.setItem("fittracker_active_battle_id", String(data.id));
      playChime(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al crear el duelo.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Join Battle
  const handleJoin = async (e) => {
    e.preventDefault();
    const pin = joinPin.trim();
    const bw = parseFloat(joinBodyweight);
    if (!pin || !joinUserName.trim() || !bw || bw <= 0) {
      alert("Por favor ingresa el PIN de 4 dígitos, tu nombre y tu peso corporal.");
      return;
    }

    try {
      setIsSubmittingJoin(true);
      const data = await joinBattle({
        pin_code: pin,
        user_name: joinUserName.trim(),
        bodyweight: bw,
      });

      setBattle(data);
      setMyParticipantName(joinUserName.trim());
      localStorage.setItem("fittracker_battle_user", joinUserName.trim());
      localStorage.setItem("fittracker_active_battle_id", String(data.id));
      playChime(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "No se pudo unir al duelo. Verificá el PIN.");
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  // Copy PIN helper
  const handleCopyPin = () => {
    if (battle?.pin_code) {
      navigator.clipboard.writeText(battle.pin_code);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // Lifter submits round
  const handleSubmitRound = async (e) => {
    e.preventDefault();
    const weight = parseFloat(liftWeight);
    const reps = parseInt(liftReps, 10);
    if (isNaN(weight) || isNaN(reps) || reps <= 0) {
      alert("Ingresa un peso y repeticiones válidos.");
      return;
    }

    try {
      setIsSubmittingRound(true);
      const updated = await submitBattleRound(battle.id, myParticipantName, weight, reps);
      setBattle(updated);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(60);
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al enviar la serie.");
    } finally {
      setIsSubmittingRound(false);
    }
  };

  // Opponent validates round
  const handleValidateRound = async (roundId) => {
    try {
      setIsValidatingRound(true);
      const repsOverride = cleanRepsInput ? parseInt(cleanRepsInput, 10) : null;
      const updated = await validateBattleRound(battle.id, roundId, repsOverride);
      setBattle(updated);
      setCleanRepsInput("");
      playChime(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al validar la serie.");
    } finally {
      setIsValidatingRound(false);
    }
  };

  // Finish battle early
  const handleFinishEarly = async () => {
    if (!window.confirm("¿Desean finalizar el duelo ahora y ver el podio con los puntajes actuales?")) {
      return;
    }
    try {
      const updated = await finishBattle(battle.id);
      setBattle(updated);
      playChime(true);
    } catch (err) {
      console.error(err);
      alert("Error al finalizar el duelo.");
    }
  };

  // Save rounds to workout
  const handleSaveToWorkout = async () => {
    try {
      setIsSavingWorkout(true);
      const res = await saveBattleToWorkout(battle.id, myParticipantName);
      setSavedWorkoutMsg(res.message);
      playChime(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al guardar en el entrenamiento.");
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // Reset duel to create/join new one
  const handleReset = () => {
    localStorage.removeItem("fittracker_active_battle_id");
    setBattle(null);
    setSavedWorkoutMsg(null);
  };

  // Helpers for current state
  const myParticipant = battle?.participants?.find(
    (p) => p.user_name.toLowerCase() === myParticipantName.toLowerCase()
  );
  const rivalParticipant = battle?.participants?.find(
    (p) => p.user_name.toLowerCase() !== myParticipantName.toLowerCase()
  );

  const isMyTurn =
    battle?.status === "in_progress" &&
    battle?.current_turn_user_name?.toLowerCase() === myParticipantName.toLowerCase();

  // Pending unvalidated round
  const pendingRound = battle?.rounds?.find((r) => !r.is_validated);

  // Am I the validator for this pending round?
  const amIValidator =
    pendingRound &&
    pendingRound.participant_name.toLowerCase() !== myParticipantName.toLowerCase();

  // Has lifter sent round and waiting for rival's validation?
  const amIWaitingForValidation =
    pendingRound &&
    pendingRound.participant_name.toLowerCase() === myParticipantName.toLowerCase();

  // Calculation previews
  const myBw = myParticipant?.bodyweight || parseFloat(createBodyweight) || 75;
  const estimatedRatio = myBw > 0 ? (parseFloat(liftWeight) || 0) / myBw : 0;
  const estimatedScore =
    myBw > 0 ? ((parseFloat(liftWeight) || 0) / Math.pow(myBw, 0.67)) * (parseInt(liftReps, 10) || 0) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#A855F7]">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-sm font-semibold text-[#A1A1AA]">Cargando módulo de Duelos...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-4xl mx-auto space-y-5 pb-24 px-1 sm:px-0 animate-fadeIn">
      <Header
        title="Duelo en Vivo 1 vs 1"
        subtitle="Competí cara a cara con tu compañero de gym normalizando por peso corporal"
      />

      {/* Connection / Polling indicator */}
      {battle && (
        <div className="flex items-center justify-between text-xs px-2 text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
            </span>
            <span className="font-bold text-white">
              Duelo #{battle.id} • {battle.exercise_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pollingError && <span className="text-amber-400 text-[11px]">{pollingError}</span>}
            <button
              type="button"
              onClick={handleReset}
              className="text-[#71717A] hover:text-red-400 text-[11px] font-bold underline"
            >
              Salir del Duelo
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. SETUP: CREATE OR JOIN LOBBY                                */}
      {/* ------------------------------------------------------------- */}
      {!battle && (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-1.5 shadow-card">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex-1 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-95 ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Crown size={16} className="text-amber-300" />
              <span>Crear Duelo (Anfitrión)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex-1 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-95 ${
                activeTab === "join"
                  ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Swords size={16} className="text-[#C084FC]" />
              <span>Unirme con PIN (Rival)</span>
            </button>
          </div>

          {/* Form: CREATE BATTLE */}
          {activeTab === "create" && (
            <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 sm:p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Crown size={20} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Configurar Nuevo Duelo
                </h3>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                    Ejercicio a competir
                  </label>
                  <select
                    value={createExerciseId}
                    onChange={(e) => setCreateExerciseId(e.target.value)}
                    className="w-full min-h-[48px] rounded-xl border border-[#2D1B4E] bg-[#0E0919] px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#A855F7]"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.muscle_group_name || "Músculo"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                      Tu Nombre / Apodo
                    </label>
                    <input
                      type="text"
                      value={createUserName}
                      onChange={(e) => setCreateUserName(e.target.value)}
                      className="iron-input w-full text-sm font-bold"
                      placeholder="Ej: Pablo"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                      Tu Peso Corporal (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={createBodyweight}
                        onChange={(e) => setCreateBodyweight(e.target.value)}
                        className="iron-input w-full text-sm font-bold pr-10"
                        placeholder="75.0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] font-bold">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                    Cantidad de Rondas
                  </label>
                  <div className="flex gap-2">
                    {[1, 3, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCreateRounds(r)}
                        className={`flex-1 min-h-[42px] rounded-xl border text-xs font-black transition ${
                          createRounds === r
                            ? "border-[#A855F7] bg-[#1C1433] text-white shadow-neon"
                            : "border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA]"
                        }`}
                      >
                        {r} {r === 1 ? "Ronda" : "Rondas"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[#2D1B4E] bg-[#0E0919] text-[11px] text-[#A1A1AA] space-y-1">
                  <p className="text-amber-300 font-bold flex items-center gap-1.5">
                    <Scale size={14} /> Normalización de Fuerza Relativa:
                  </p>
                  <p>
                    El ganador se determina por el score relativo:{" "}
                    <code className="text-[#C084FC]">(peso / peso_corp^0.67) × reps</code>. ¡50kg
                    levantados por alguien de 50kg tienen mucho más mérito que por alguien de 90kg!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="iron-btn-primary w-full min-h-[50px] text-sm font-black flex items-center justify-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>Crear Duelo y Generar PIN</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Form: JOIN BATTLE */}
          {activeTab === "join" && (
            <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 sm:p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Swords size={20} className="text-[#C084FC]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Unirse a Duelo con PIN
                </h3>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5 text-center">
                    Ingresá el PIN de 4 dígitos proporcionado por tu amigo
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={joinPin}
                    onChange={(e) => setJoinPin(e.target.value.trim())}
                    placeholder="Ej: 4819"
                    className="w-full text-center text-3xl sm:text-4xl font-mono font-black tracking-widest py-3 rounded-2xl border-2 border-[#A855F7] bg-[#0E0919] text-white outline-none shadow-neon focus:ring-2 focus:ring-[#C084FC]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                      Tu Nombre / Apodo
                    </label>
                    <input
                      type="text"
                      value={joinUserName}
                      onChange={(e) => setJoinUserName(e.target.value)}
                      className="iron-input w-full text-sm font-bold"
                      placeholder="Ej: Lucas"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                      Tu Peso Corporal (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={joinBodyweight}
                        onChange={(e) => setJoinBodyweight(e.target.value)}
                        className="iron-input w-full text-sm font-bold pr-10"
                        placeholder="80.0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] font-bold">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingJoin || !joinPin.trim()}
                  className="iron-btn-primary w-full min-h-[50px] text-sm font-black flex items-center justify-center gap-2"
                >
                  {isSubmittingJoin ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Swords size={18} />
                      <span>Entrar al Duelo</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. LOBBY WAITING FOR OPPONENT                                 */}
      {/* ------------------------------------------------------------- */}
      {battle && battle.status === "waiting" && (
        <div className="rounded-2xl border-2 border-[#A855F7] bg-[#140E24] p-6 text-center space-y-5 shadow-neon animate-fadeIn">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#9333EA]/20 border border-[#A855F7]/40 text-[#C084FC]">
            <Swords size={32} />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#C084FC]">
              SALA DE DUELO CREADA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Esperando a tu compañero de gym...
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Decile a tu rival que ingrese este PIN en su celular:
            </p>
          </div>

          {/* Giant PIN Badge */}
          <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-[#A855F7] bg-[#0E0919] px-6 py-4 shadow-[0_0_30px_rgba(168,85,247,0.35)]">
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-white">
              {battle.pin_code}
            </span>
            <button
              type="button"
              onClick={handleCopyPin}
              className="p-2 rounded-xl bg-[#1C1433] text-[#C084FC] hover:text-white transition active:scale-95"
              title="Copiar PIN"
            >
              {copiedPin ? <Check size={20} className="text-[#34D399]" /> : <Copy size={20} />}
            </button>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left text-xs">
            <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3">
              <span className="text-[10px] text-[#71717A] uppercase font-bold block">Ejercicio</span>
              <span className="font-black text-white truncate block">{battle.exercise_name}</span>
            </div>
            <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3">
              <span className="text-[10px] text-[#71717A] uppercase font-bold block">Rondas</span>
              <span className="font-black text-white block">{battle.target_rounds} Rondas</span>
            </div>
          </div>

          {/* Pulsing Radar */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-300 animate-pulse pt-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Esperando conexión del rival en tiempo real...</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. BATTLE IN PROGRESS (TURNOS EN VIVO & VALIDACIÓN CRUZADA)    */}
      {/* ------------------------------------------------------------- */}
      {battle && battle.status === "in_progress" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Versus Header Banner */}
          <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 shadow-card">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] border-b border-[#2D1B4E] pb-2 mb-3">
              <div className="flex items-center gap-1.5 font-black text-white">
                <Dumbbell size={15} className="text-[#A855F7]" />
                <span className="truncate break-words">{battle.exercise_name}</span>
              </div>
              <span className="font-mono font-black text-[#C084FC]">
                Ronda {battle.current_round} de {battle.target_rounds}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 items-center">
              {/* Participant 1 */}
              {battle.participants[0] && (
                <div
                  className={`rounded-xl border p-3 transition ${
                    battle.current_turn_user_name === battle.participants[0].user_name
                      ? "border-[#A855F7] bg-[#1C1433] shadow-neon"
                      : "border-[#2D1B4E] bg-[#0E0919]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-black text-white truncate">
                      {battle.participants[0].user_name}
                      {battle.participants[0].user_name === myParticipantName ? " (Vos)" : ""}
                    </span>
                    {battle.current_turn_user_name === battle.participants[0].user_name && (
                      <span className="h-2 w-2 rounded-full bg-[#34D399] animate-ping" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#A1A1AA]">
                    <span>{battle.participants[0].bodyweight} kg</span>
                    <span className="font-mono font-black text-[#34D399]">
                      {battle.participants[0].total_score} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Participant 2 */}
              {battle.participants[1] && (
                <div
                  className={`rounded-xl border p-3 transition ${
                    battle.current_turn_user_name === battle.participants[1].user_name
                      ? "border-[#A855F7] bg-[#1C1433] shadow-neon"
                      : "border-[#2D1B4E] bg-[#0E0919]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-black text-white truncate">
                      {battle.participants[1].user_name}
                      {battle.participants[1].user_name === myParticipantName ? " (Vos)" : ""}
                    </span>
                    {battle.current_turn_user_name === battle.participants[1].user_name && (
                      <span className="h-2 w-2 rounded-full bg-[#34D399] animate-ping" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#A1A1AA]">
                    <span>{battle.participants[1].bodyweight} kg</span>
                    <span className="font-mono font-black text-[#34D399]">
                      {battle.participants[1].total_score} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TURN ACTION CONTAINER */}
          {/* CASE A: OPPONENT COMPLETED A SET -> I MUST CROSS-VALIDATE CLEAN REPS! */}
          {amIValidator && (
            <div className="rounded-2xl border-2 border-[#34D399] bg-[#0E1F18] p-5 shadow-[0_0_25px_rgba(52,211,153,0.3)] space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#34D399]/20 border border-[#34D399] flex items-center justify-center text-[#34D399] flex-shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#34D399]">
                    HONESTIDAD PRESENCIAL REQUERIDA
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Validá la serie de {pendingRound.participant_name}
                  </h3>
                </div>
              </div>

              <div className="rounded-xl border border-[#34D399]/40 bg-[#09060E] p-4 text-center space-y-1">
                <p className="text-xs text-[#A1A1AA]">Carga declarada por tu rival:</p>
                <p className="text-2xl sm:text-3xl font-mono font-black text-white">
                  {pendingRound.weight_lifted} kg × {pendingRound.reps} reps
                </p>
                <p className="text-xs font-bold text-[#34D399]">
                  {pendingRound.bodyweight_ratio}× su peso corporal
                </p>
              </div>

              {/* Optional clean reps adjustment */}
              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1 text-center">
                  ¿Hizo menos reps limpias sin trampa o balanceo? (Opcional):
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={`Repeticiones válidas (${pendingRound.reps})`}
                  value={cleanRepsInput}
                  onChange={(e) => setCleanRepsInput(e.target.value)}
                  className="iron-input w-36 mx-auto text-center font-bold text-sm block"
                />
              </div>

              <button
                type="button"
                onClick={() => handleValidateRound(pendingRound.id)}
                disabled={isValidatingRound}
                className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#34D399] to-[#10B981] text-[#09060E] font-black text-base flex items-center justify-center gap-2 hover:from-[#10B981] hover:to-[#34D399] active:scale-[0.98] transition shadow-[0_0_20px_rgba(52,211,153,0.4)]"
              >
                {isValidatingRound ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Check size={22} strokeWidth={3} />
                    <span>✓ Validar Repeticiones Limpias</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* CASE B: I COMPLETED A SET -> WAITING FOR RIVAL'S VALIDATION */}
          {amIWaitingForValidation && (
            <div className="rounded-2xl border border-[#A855F7] bg-[#140E24] p-5 text-center space-y-3 shadow-neon">
              <Loader2 size={32} className="animate-spin text-[#A855F7] mx-auto" />
              <h3 className="text-base font-black text-white">
                Esperando que tu compañero valide tu serie...
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Declaraste:{" "}
                <strong className="text-white">
                  {pendingRound.weight_lifted} kg × {pendingRound.reps} reps
                </strong>
                . Tu rival está confirmando en su pantalla que la técnica haya sido limpia.
              </p>
            </div>
          )}

          {/* CASE C: IT'S MY TURN TO LIFT */}
          {isMyTurn && !pendingRound && (
            <div className="rounded-2xl border-2 border-[#A855F7] bg-[#140E24] p-4 sm:p-5 shadow-neon space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Flame size={20} className="text-orange-400" />
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                    ¡Tu Turno de Levantar!
                  </h3>
                </div>
                <span className="rounded-full bg-[#9333EA]/20 border border-[#A855F7]/40 px-2.5 py-0.5 text-[11px] font-black text-[#C084FC]">
                  Ronda {battle.current_round}
                </span>
              </div>

              <form onSubmit={handleSubmitRound} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Weight Input */}
                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5 text-center">
                      Peso Levantado
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={liftWeight}
                        onChange={(e) => setLiftWeight(e.target.value)}
                        className="w-full text-center px-2 py-2.5 text-xl font-black rounded-xl border border-[#2D1B4E] bg-[#0E0919] text-white outline-none focus:border-[#A855F7]"
                        placeholder="kg"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A]">
                        kg
                      </span>
                    </div>
                  </div>

                  {/* Reps Input */}
                  <div>
                    <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5 text-center">
                      Repeticiones Limpias
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        inputMode="decimal"
                        value={liftReps}
                        onChange={(e) => setLiftReps(e.target.value)}
                        className="w-full text-center px-2 py-2.5 text-xl font-black rounded-xl border border-[#2D1B4E] bg-[#0E0919] text-white outline-none focus:border-[#A855F7]"
                        placeholder="reps"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A]">
                        reps
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-Time Formula Score Preview */}
                <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold block">
                      Ratio Fuerza Relativa
                    </span>
                    <span className="font-mono font-black text-white text-sm">
                      {estimatedRatio.toFixed(2)}× peso corporal
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold block">
                      Score de Duelo
                    </span>
                    <span className="font-mono font-black text-[#34D399] text-base">
                      +{estimatedScore.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRound}
                  className="iron-btn-primary w-full min-h-[50px] text-sm font-black flex items-center justify-center gap-2"
                >
                  {isSubmittingRound ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>Completar Serie y Enviar a Validación</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* CASE D: RIVAL IS CURRENTLY LIFTING */}
          {!isMyTurn && !pendingRound && (
            <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-6 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1C1433] text-[#A855F7] animate-bounce">
                <Dumbbell size={24} />
              </div>
              <h3 className="text-base font-black text-white">
                Turno de {battle.current_turn_user_name}
              </h3>
              <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                Tu compañero está en la barra o máquina. Prestá atención a su recorrido y rango de
                movimiento para validarlo cuando termine.
              </p>
            </div>
          )}

          {/* Rounds Log History */}
          {battle.rounds && battle.rounds.length > 0 && (
            <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 shadow-card space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                Historial de Series del Duelo
              </h4>

              <div className="space-y-2">
                {battle.rounds.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      r.is_validated
                        ? "border-[#2D1B4E] bg-[#0E0919]"
                        : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <div>
                      <span className="font-black text-white mr-2">{r.participant_name}</span>
                      <span className="text-[#A1A1AA]">
                        {r.weight_lifted} kg × {r.reps} reps
                      </span>
                      <span className="ml-2 text-[#C084FC] font-mono font-bold">
                        ({r.bodyweight_ratio}×)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.is_validated ? (
                        <span className="font-mono font-black text-[#34D399]">
                          +{r.relative_score} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 font-bold">
                          Pendiente validación
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={handleFinishEarly}
                  className="text-xs text-[#71717A] hover:text-white underline font-bold"
                >
                  Finalizar Duelo y ver Podio ahora
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. FINAL PODIUM SCREEN (STATUS === 'FINISHED')                */}
      {/* ------------------------------------------------------------- */}
      {battle && battle.status === "finished" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Victory Banner */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1C1433] to-[#140E24] p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.25)] space-y-3">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/20 border-2 border-amber-400 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
              <Trophy size={42} strokeWidth={2.5} />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                ¡DUELO FINALIZADO!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Ganador: {battle.winner_user_name || "Empate Técnico"}
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Competencia honesta en {battle.exercise_name} normalizada por peso corporal.
              </p>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {battle.participants.map((p, idx) => {
              const isWinner = battle.winner_user_name === p.user_name;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 p-5 space-y-3.5 relative overflow-hidden ${
                    isWinner
                      ? "border-amber-400 bg-[#1C1433] shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                      : "border-[#2D1B4E] bg-[#140E24]"
                  }`}
                >
                  {isWinner && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-400 text-[#09060E] px-2.5 py-0.5 text-[10px] font-black uppercase">
                      <Crown size={12} />
                      <span>CAMPEÓN</span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-black text-white truncate break-words">
                      {p.user_name}
                      {p.user_name.toLowerCase() === myParticipantName.toLowerCase() ? " (Vos)" : ""}
                    </h3>
                    <span className="text-xs text-[#A1A1AA] font-semibold">
                      Peso corporal: <strong className="text-white">{p.bodyweight} kg</strong>
                    </span>
                  </div>

                  {/* Multiplier in HUGE text */}
                  <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#71717A] block">
                      Multiplicador de Fuerza Relativa
                    </span>
                    <span
                      className={`text-3xl sm:text-4xl font-mono font-black tracking-tight ${
                        isWinner ? "text-amber-300 drop-shadow-md" : "text-white"
                      }`}
                    >
                      {p.best_ratio.toFixed(2)}×
                    </span>
                    <span className="text-[11px] text-[#A1A1AA] block mt-0.5">
                      de su peso corporal
                    </span>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-[#2D1B4E] bg-[#0E0919] p-2">
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">
                        Carga Máxima
                      </span>
                      <span className="font-mono font-black text-white">{p.max_weight} kg</span>
                    </div>
                    <div className="rounded-lg border border-[#2D1B4E] bg-[#0E0919] p-2">
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">
                        Score Duelo
                      </span>
                      <span className="font-mono font-black text-[#34D399]">
                        {p.total_score} pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save to Workout & Next Actions */}
          <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-5 shadow-card space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
              Registrar en tu Entrenamiento del Día
            </h4>

            {savedWorkoutMsg ? (
              <div className="p-3.5 rounded-xl border border-[#34D399] bg-[#0E1F18] text-[#34D399] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>{savedWorkoutMsg}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveToWorkout}
                disabled={isSavingWorkout}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white text-xs font-black flex items-center justify-center gap-2 hover:from-[#7E22CE] hover:to-[#9333EA] active:scale-95 transition shadow-neon"
              >
                {isSavingWorkout ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar mis series de este duelo en el entrenamiento de hoy</span>
                  </>
                )}
              </button>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="iron-btn-secondary flex-1 min-h-[44px] text-xs font-black"
              >
                <Swords size={16} />
                <span>Nuevo Duelo</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="iron-btn-ghost flex-1 min-h-[44px] text-xs font-black"
              >
                Volver a Entrenar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
