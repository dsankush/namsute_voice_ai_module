"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  Phone,
  PhoneOff,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  Stethoscope,
  Scale,
  Calculator,
  Briefcase,
  Compass,
  Building2,
  GraduationCap,
  Truck,
  Code2,
  Check,
  Radio,
  User,
  Clock,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  Sprout,
  FlaskConical,
  Globe,
  Car,
} from "lucide-react";
import { INDUSTRY_FLOWS, IndustryFlow, IndustryMessage } from "@/data/industryFlows";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ICON_MAP: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope size={16} />,
  Scale: <Scale size={16} />,
  Calculator: <Calculator size={16} />,
  Briefcase: <Briefcase size={16} />,
  Compass: <Compass size={16} />,
  Building2: <Building2 size={16} />,
  GraduationCap: <GraduationCap size={16} />,
  Truck: <Truck size={16} />,
  Sprout: <Sprout size={16} />,
  FlaskConical: <FlaskConical size={16} />,
  Car: <Car size={16} />,
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) || "";
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Reads a newline-delimited JSON response body (used by the streaming chat
// reply path — /api/ai-demo/chat responds this way only for doctors-clinics
// voice/audio turns) and invokes onLine for each parsed object, in arrival
// order. A malformed line is skipped rather than aborting the whole stream.
async function readNdjsonLines(res: Response, onLine: (obj: any) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      try { onLine(JSON.parse(line)); } catch { /* skip malformed line */ }
    }
  }
  const rest = buffer.trim();
  if (rest) {
    try { onLine(JSON.parse(rest)); } catch { /* skip malformed trailing line */ }
  }
}

const VOICE_PERSONAS = [
  { id: "ritu", label: "Ritu", gender: "Female", desc: "Warm & Natural" },
  { id: "priya", label: "Priya", gender: "Female", desc: "Corporate Receptionist" },
  { id: "shubh", label: "Shubh", gender: "Male", desc: "Calm & Articulate" },
  { id: "aditya", label: "Aditya", gender: "Male", desc: "Business Executive" },
];

const LANGUAGE_OPTIONS = [
  { id: "auto", native: "Auto", english: "Detect automatically" },
  { id: "hi-IN", native: "हिन्दी", english: "Hindi" },
  { id: "en-IN", native: "English", english: "English" },
  { id: "pa-IN", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { id: "ta-IN", native: "தமிழ்", english: "Tamil" },
  { id: "te-IN", native: "తెలుగు", english: "Telugu" },
  { id: "bn-IN", native: "বাংলা", english: "Bengali" },
  { id: "ml-IN", native: "മലയാളം", english: "Malayalam" },
  { id: "kn-IN", native: "ಕನ್ನಡ", english: "Kannada" },
  { id: "gu-IN", native: "ગુજરાતી", english: "Gujarati" },
  { id: "or-IN", native: "ଓଡ଼ିଆ", english: "Odia" },
];

// Brand lime (#9BEA16) stays the site-wide accent for buttons/pills, but the
// live-AI surfaces (orb, waveform, voice avatars) get a distinct violet→cyan
// gradient — an ElevenLabs/Vapi-style "AI layer" treatment so the console
// visually reads as a distinct intelligence layer sitting on top of the brand.
const AI_GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #6366F1 45%, #22D3EE 100%)";
const AI_GRADIENT_SOFT = "linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.2) 45%, rgba(34, 211, 238, 0.25) 100%)";
const AI_GRADIENT_RADIAL = "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(34, 211, 238, 0.15) 55%, rgba(0, 0, 0, 0.85) 80%)";

// One repeating tile of a smooth wave silhouette — the same path rendered
// A real audio-style waveform — symmetric bars growing from a center line,
// like a live call's audio visualizer — instead of a decorative background
// that drifts regardless of what's happening. It only reacts to the actual
// speech state: flat and barely breathing at idle, and genuinely energetic
// (taller, faster, color-coded) the instant the AI or the caller is speaking.
// No horizontal motion at all — the reactivity IS the animation.
// Genuinely audio-reactive: reads real-time frequency data off whichever
// analyser is live for the current state (the mic's analyser while the user
// is speaking, the currently-playing TTS clip's analyser while the AI is)
// and drives each bar directly via refs in a requestAnimationFrame loop —
// not React state, so a 60fps visualizer doesn't force 60 renders/sec of the
// whole widget. Bars grow from a center baseline (scaleY, not height) for
// the familiar symmetric "audio waveform" look, with attack/decay smoothing
// so it reads as a real VU meter instead of jittering frame to frame. Falls
// back to a slow ambient breathing animation at idle, when there's nothing
// to visualize.
function SpeechWaveform({
  state,
  userAnalyserRef,
  aiAnalyserRef,
}: {
  state: "idle" | "ai" | "user";
  userAnalyserRef: React.RefObject<AnalyserNode | null>;
  aiAnalyserRef: React.RefObject<AnalyserNode | null>;
}) {
  const barCount = 48;
  const isActive = state !== "idle";
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<number[]>(new Array(barCount).fill(0));

  const baseColor = state === "ai" ? "#8B5CF6" : state === "user" ? "#0EA5E9" : "#6B8F1A";
  const peakColor = state === "ai" ? "#22D3EE" : state === "user" ? "#7DD3FC" : "#C6F467";
  const gradient = `linear-gradient(180deg, ${peakColor}, ${baseColor})`;

  const shapeFactor = useCallback(
    (i: number) => 0.4 + 0.6 * Math.pow(Math.sin((i / (barCount - 1)) * Math.PI), 1.2),
    []
  );

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      smoothedRef.current.fill(0);
      return;
    }

    let freqData: Uint8Array<ArrayBuffer> | null = null;
    let lastBinCount = 0;

    const tick = () => {
      const analyser = state === "ai" ? aiAnalyserRef.current : state === "user" ? userAnalyserRef.current : null;
      if (analyser) {
        if (!freqData || lastBinCount !== analyser.frequencyBinCount) {
          lastBinCount = analyser.frequencyBinCount;
          freqData = new Uint8Array(lastBinCount);
        }
        analyser.getByteFrequencyData(freqData);
        // Speech/voice energy lives almost entirely in the lower ~70% of the
        // spectrum — including the near-silent top end made every bar out
        // toward the edges look permanently dead regardless of how loud the
        // actual speech was.
        const usableBins = Math.max(1, Math.floor(lastBinCount * 0.7));
        for (let i = 0; i < barCount; i++) {
          const start = Math.floor((i / barCount) * usableBins);
          const end = Math.max(start + 1, Math.floor(((i + 1) / barCount) * usableBins));
          let sum = 0;
          for (let j = start; j < end; j++) sum += freqData[j];
          const avg = sum / (end - start) / 255;

          const prev = smoothedRef.current[i];
          // Fast attack, slower decay — a real VU-meter feel instead of
          // flickering with every frame's raw FFT noise.
          smoothedRef.current[i] = avg > prev ? prev + (avg - prev) * 0.65 : prev + (avg - prev) * 0.12;

          const el = barRefs.current[i];
          if (el) {
            const shape = shapeFactor(i);
            const level = smoothedRef.current[i];
            const scale = Math.max(0.05, shape * 0.12 + level * shape * 1.7);
            el.style.transform = `scaleY(${scale})`;
            el.style.opacity = String(Math.min(1, 0.4 + level * 1.3));
            el.style.boxShadow = level > 0.3 ? `0 0 ${5 + level * 16}px ${peakColor}` : "none";
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isActive, peakColor, shapeFactor]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const shape = shapeFactor(i);
        const restScale = 0.045 + shape * 0.075;
        return (
          <motion.div
            key={i}
            ref={(el) => { barRefs.current[i] = el; }}
            animate={
              !isActive
                ? { scaleY: [restScale * 0.55, restScale, restScale * 0.55], opacity: [0.28, 0.5, 0.28] }
                : undefined
            }
            transition={
              !isActive
                ? { duration: 2.2 + (i % 5) * 0.25, repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }
                : undefined
            }
            style={{
              width: "3px",
              height: "100%",
              borderRadius: "3px",
              background: gradient,
              transformOrigin: "center",
              transform: isActive ? `scaleY(${restScale})` : undefined,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
  );
}

// Rendered in place of the live console for any industry flagged
// `comingSoon` in industryFlows.ts. Deliberately minimal — icon, badge,
// brand name, one line — no CTA, no form.
// Small animated donut used by the CRM panel's "N/5 captured" header —
// purely presentational, driven by the same filled/total counts the field
// cards below already compute.
function CircularProgress({ filled, total, gradientId }: { filled: number; total: number; gradientId: string }) {
  const size = 40;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? filled / total : 0;
  const isComplete = filled === total && total > 0;

  return (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "#9BEA16" : `url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10.5px",
          fontWeight: 700,
          color: isComplete ? "#9BEA16" : "#F5F5F0",
        }}
      >
        {filled}/{total}
      </div>
    </div>
  );
}

// A single floating "annotation" showing one piece of captured customer data
// — a glass pill positioned around the orb instead of a row inside a boxed
// CRM panel. `row` lays icon/text horizontally (used for the top summary
// badge); the default is icon+label on one line, value below (used for the
// four corner badges). Positioned by the caller via `style` (top/left/right/
// bottom); .floating-badge's mobile media query overrides that to `static`
// so these reflow into a normal wrapped row instead of overlapping.
function FloatingDataBadge({
  className,
  style,
  icon,
  label,
  value,
  subvalue,
  placeholder = "—",
  color,
  filled,
  row = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  icon: React.ReactNode;
  label: string;
  value?: string;
  subvalue?: string;
  placeholder?: string;
  color: string;
  filled: boolean;
  row?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: row ? "row" : "column",
        alignItems: row ? "center" : "flex-start",
        gap: row ? "8px" : "2px",
        padding: "7px 12px",
        borderRadius: "14px",
        background: "rgba(8, 8, 10, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${filled ? `${color}66` : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: filled ? `0 4px 24px ${color}26` : "none",
        maxWidth: "150px",
        pointerEvents: "auto",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {icon}
        <span style={{ fontSize: "9px", color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: filled ? "#F5F5F0" : "#52525B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value || placeholder}
        </div>
        {subvalue && (
          <div style={{ fontSize: "10px", color: "#71717A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subvalue}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ComingSoonPanel({ industry }: { industry: IndustryFlow }) {
  return (
    <div
      style={{
        borderRadius: "28px",
        background: "linear-gradient(180deg, rgba(22, 22, 28, 0.92) 0%, rgba(10, 10, 14, 0.98) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        minHeight: "460px",
        maxWidth: "980px",
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 32px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Ambient AI-gradient glow field */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.12) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", width: "88px", height: "88px", marginBottom: "22px" }}>
        <motion.div
          animate={{ scale: [1, 1.35, 1.7], opacity: [0.5, 0.15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1.5px solid rgba(139, 92, 246, 0.5)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.35, 1.7], opacity: [0.5, 0.15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.2 }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1.5px solid rgba(34, 211, 238, 0.4)",
          }}
        />
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: AI_GRADIENT_RADIAL,
            border: "1.5px solid rgba(139, 92, 246, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            zIndex: 1,
          }}
        >
          {React.cloneElement(
            (ICON_MAP[industry.iconName] || <Sparkles size={18} />) as React.ReactElement<{ size?: number }>,
            { size: 30 }
          )}
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 14px",
          borderRadius: "999px",
          background: AI_GRADIENT_SOFT,
          border: "1px solid rgba(139, 92, 246, 0.4)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#C4B5FD",
          marginBottom: "16px",
        }}
      >
        <Sparkles size={11} />
        <span>Coming Soon</span>
      </div>

      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#F5F5F0", marginBottom: "8px" }}>
        {industry.brandName}
      </h3>
      <p style={{ fontSize: "13.5px", color: "#8E8E93", maxWidth: "420px", lineHeight: 1.6 }}>
        We&apos;re teaching Namuste to speak {industry.name}. Voice &amp; chat launching soon.
      </p>
    </div>
  );
}

interface AIVoiceChatbotEngineProps {
  initialIndustryId?: string;
  lockedIndustryId?: string;
  hideIndustrySelector?: boolean;
}

export default function AIVoiceChatbotEngine({
  initialIndustryId,
  lockedIndustryId,
  hideIndustrySelector = false,
}: AIVoiceChatbotEngineProps = {}) {
  const effectiveIndustry = lockedIndustryId || initialIndustryId || "doctors-clinics";
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>(effectiveIndustry);
  const [channel, setChannel] = useState<"voice" | "chat">("voice");

  // Call & Audio states
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [speechStatusText, setSpeechStatusText] = useState<string>("Click to start voice call");
  const [liveUserTranscript, setLiveUserTranscript] = useState<string>("");
  const [currentLanguageCode, setCurrentLanguageCode] = useState<string>("en-IN");
  const [speechLanguageMode, setSpeechLanguageMode] = useState<string>("auto");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("ritu");
  const [showJsonPayload, setShowJsonPayload] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Language & voice pickers — shadcn/ui Popover (Radix underneath) handles
  // outside-click, ESC-to-close, and focus trapping natively, replacing the
  // hand-rolled click-outside effect this used to need.
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState<boolean>(false);
  const [voicePopoverOpen, setVoicePopoverOpen] = useState<boolean>(false);
  // Unique per-mount id for the CRM progress ring's SVG gradient — avoids id
  // collisions if this component is ever mounted more than once on a page.
  const crmGradientId = React.useId();

  // Mouse-tracked 3D tilt on the orb — purely cosmetic, no bearing on call
  // state. Reset to centered on mouse leave.
  const orbMouseX = useMotionValue(0);
  const orbMouseY = useMotionValue(0);
  const orbRotateX = useTransform(orbMouseY, [-40, 40], [12, -12]);
  const orbRotateY = useTransform(orbMouseX, [-40, 40], [-12, 12]);
  const handleOrbMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    orbMouseX.set(e.clientX - rect.left - rect.width / 2);
    orbMouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleOrbMouseLeave = () => {
    orbMouseX.set(0);
    orbMouseY.set(0);
  };

  // Conversation state
  const [conversationHistory, setConversationHistory] = useState<IndustryMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Extracted Lead & Webhook Data
  const [extractedData, setExtractedData] = useState<{
    name?: string;
    mobile?: string;
    dob?: string;
    department?: string;
    doctor?: string;
    slot?: string;
    intent?: string;
    summary?: string;
    appointment_id?: string;
    appointment_status?: string;
    confirmed?: boolean;
    vehicleModel?: string;
    registrationNumber?: string;
    serviceType?: string;
    dealerLocation?: string;
    reference_id?: string;
    [key: string]: any;
  }>({});
  const [webhookSent, setWebhookSent] = useState<boolean>(false);
  // Guards against duplicate webhook dispatch for the same call. A ref (not
  // just the `webhookSent` state) because it must block a second dispatch
  // synchronously, before React has re-rendered with the updated state — the
  // backend can legitimately report isComplete:true again on a later turn
  // (e.g. GPT re-confirming after the booking), and without this the n8n
  // webhook — and the WhatsApp message it triggers — fired more than once.
  const webhookSentRef = useRef<boolean>(false);

  // References for live async callbacks
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Real-time frequency analysis of whichever AI audio clip is currently
  // playing, feeding the waveform visualizer with the ACTUAL audio instead
  // of a synthetic animation. One AudioContext is created lazily and reused
  // for every clip; each new <audio> element gets its own source node (the
  // Web Audio API only allows one per element) wired through an analyser and
  // back out to the speakers — skipping the reconnect-to-destination step
  // would silently mute playback, so every attach site must do both.
  const aiAudioCtxRef = useRef<AudioContext | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationHistoryRef = useRef<IndustryMessage[]>([]);
  const extractedDataRef = useRef<any>({});
  const selectedSpeakerRef = useRef<string>("ritu");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // MediaRecorder + amplitude-VAD mic capture (replaces browser SpeechRecognition)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechDetectedRef = useRef<boolean>(false);
  const pendingFinalizeRef = useRef<boolean>(false);
  // "" = auto-detect language every turn; "hi-IN"/"en-IN" = user manually forced it via the language toggle
  const manualLanguageHintRef = useRef<string>("");
  // Mirrors currentLanguageCode for the same stale-closure reason as the refs
  // below — used to hint Sarvam's STT with whatever language is already
  // established in Auto mode (see startLiveListening) instead of sending
  // "unknown" on every single turn, which forces Sarvam to blind-guess even
  // deep into a call where the language is already obvious from context.
  // Verified live: Sarvam's STT can transcribe a short, unhinted utterance
  // ("Ankush") into a COMPLETELY different script/language (Kannada, 96%
  // claimed confidence) — not just mislabel it — so a hint that narrows what
  // it's listening for is the real fix, not just filtering its output after.
  const currentLanguageCodeRef = useRef<string>("en-IN");
  // Mirror isCallActive/isMuted into refs so async STT callbacks (which outlive
  // a single render) always check current state instead of a stale closure.
  const isCallActiveRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  // Auto-hangup after a confirmed booking: armed once the AI's confirmation
  // reply finishes and listening resumes, cleared if the caller starts
  // speaking again (they get a real grace window, not a hard cutoff).
  const autoEndCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeIndustry: IndustryFlow = INDUSTRY_FLOWS[selectedIndustryId] || INDUSTRY_FLOWS["doctors-clinics"];
  // Only "doctors-clinics" has real deterministic backend support today
  // (clinicEngine.ts + clinicTemplates.ts + DOCTOR_ROSTER) — every other
  // vertical falls through to an ungated raw GPT call. Rather than let
  // visitors reach that silently, every comingSoon-flagged industry (see
  // industryFlows.ts) renders the ComingSoonPanel below instead of the
  // live console.
  const isComingSoon = !!activeIndustry.comingSoon;

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    extractedDataRef.current = extractedData;
  }, [extractedData]);

  useEffect(() => {
    selectedSpeakerRef.current = selectedSpeaker;
  }, [selectedSpeaker]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    currentLanguageCodeRef.current = currentLanguageCode;
  }, [currentLanguageCode]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (channel === "chat" && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory, channel]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
  }, []);

  // Wires a freshly-created AI speech <audio> element through a Web Audio
  // analyser so the waveform can visualize the REAL clip instead of a
  // canned animation — called once per new Audio() at every playback site.
  // createMediaElementSource() only works once per element (a second call on
  // the same element throws), which is fine here since each TTS response
  // creates a brand-new element anyway. Must reconnect the analyser to the
  // context's destination, or the element's audio is silently captured into
  // the graph and never reaches the speakers.
  const attachAiAnalyser = useCallback((audioEl: HTMLAudioElement) => {
    try {
      if (!aiAudioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        aiAudioCtxRef.current = new Ctx();
      }
      const ctx = aiAudioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      aiAnalyserRef.current = analyser;
    } catch (e) {
      // Visualization-only failure — playback itself doesn't depend on this,
      // so the waveform just falls back to its idle animation for this turn.
      console.warn("AI audio analyser attach failed:", e);
    }
  }, []);

  // Stops any in-progress capture and DISCARDS it (does not transcribe/send).
  // Used whenever we need to cut the mic immediately — e.g. before the AI
  // starts speaking, or when the call ends. The VAD-triggered finalize path
  // (see startLiveListening) sets pendingFinalizeRef itself before calling
  // recorder.stop(), so a plain stopLiveListening() here never accidentally
  // sends a still-buffering recording.
  const stopLiveListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    pendingFinalizeRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    recordedChunksRef.current = [];
    speechDetectedRef.current = false;
    setIsUserSpeaking(false);
  }, []);

  // ─── AI-speech watchdog ──────────────────────────────────────────────────
  // The mic is meant to auto-resume the instant AI audio finishes (via the
  // audio/utterance "ended" event). In practice that event occasionally never
  // fires — a decode hiccup, a browser TTS voice-loading quirk, etc. — which
  // silently strands the call: no error, just a mic that never comes back on
  // until the user manually hits the "Speak" button. This watchdog guarantees
  // the resume callback fires exactly once no matter what the audio/browser
  // does, closing that gap without needing to diagnose every possible failure
  // mode individually.
  const aiSpeechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const aiSpeechResolvedRef = useRef<boolean>(true);

  const armAiSpeechWatchdog = useCallback((onDone: () => void, ms = 12000) => {
    aiSpeechResolvedRef.current = false;
    if (aiSpeechWatchdogRef.current) clearTimeout(aiSpeechWatchdogRef.current);
    aiSpeechWatchdogRef.current = setTimeout(() => {
      if (!aiSpeechResolvedRef.current) {
        aiSpeechResolvedRef.current = true;
        console.warn("AI speech watchdog fired — 'ended' event never arrived, forcing mic resume.");
        onDone();
      }
    }, ms);
  }, []);

  const resolveAiSpeech = useCallback((onDone: () => void) => {
    if (aiSpeechResolvedRef.current) return; // already resolved (watchdog or a duplicate event) — don't double-fire
    aiSpeechResolvedRef.current = true;
    if (aiSpeechWatchdogRef.current) {
      clearTimeout(aiSpeechWatchdogRef.current);
      aiSpeechWatchdogRef.current = null;
    }
    onDone();
  }, []);

  // Web Speech Fallback
  const fallbackBrowserSpeech = useCallback((text: string, langCode = "en-IN", onEndedCallback?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEndedCallback) onEndedCallback();
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~`[\]()•]/g, " ").replace(/\s+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langCode || "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsAiSpeaking(true);
      setSpeechStatusText("AI speaking...");
      armAiSpeechWatchdog(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        setSpeechStatusText("Listening to you...");
        if (onEndedCallback) onEndedCallback();
      });
    };
    utterance.onend = () => {
      resolveAiSpeech(() => {
        setIsAiSpeaking(false);
        setSpeechStatusText("Listening to you...");
        if (onEndedCallback) onEndedCallback();
      });
    };
    utterance.onerror = () => {
      resolveAiSpeech(() => {
        setIsAiSpeaking(false);
        if (onEndedCallback) onEndedCallback();
      });
    };
    window.speechSynthesis.speak(utterance);
  }, [armAiSpeechWatchdog, resolveAiSpeech]);

  // Audible Speech Engine (Sarvam bulbul:v3 with fallback)
  const speakTextAudible = useCallback(async (text: string, langCode = "en-IN", onEndedCallback?: () => void, tone: string = "neutral") => {
    if (!isSpeakerOn) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    stopCurrentAudio();
    stopLiveListening();
    setIsAiSpeaking(true);
    setSpeechStatusText("AI speaking...");

    try {
      const res = await fetch("/api/ai-demo/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tts",
          text,
          languageCode: langCode || "en-IN",
          speaker: selectedSpeakerRef.current || selectedSpeaker || "ritu",
          tone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          attachAiAnalyser(audio);
          currentAudioRef.current = audio;
          const resumeAfterAudio = () => {
            stopCurrentAudio();
            setIsAiSpeaking(false);
            setSpeechStatusText("Listening to you...");
            if (onEndedCallback) onEndedCallback();
          };
          audio.onended = () => resolveAiSpeech(resumeAfterAudio);
          audio.onerror = () => {
            resolveAiSpeech(() => fallbackBrowserSpeech(text, langCode, onEndedCallback));
          };
          audio.onloadedmetadata = () => {
            // Once the real duration is known, stop guessing — the watchdog
            // only needs to outlive actual playback by a small buffer, not a
            // blind worst-case timeout.
            if (isFinite(audio.duration) && audio.duration > 0) {
              armAiSpeechWatchdog(resumeAfterAudio, audio.duration * 1000 + 800);
            }
          };
          armAiSpeechWatchdog(resumeAfterAudio); // coarse ceiling until duration is known
          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn("Sarvam TTS error fallback:", e);
    }

    fallbackBrowserSpeech(text, langCode, onEndedCallback);
  }, [armAiSpeechWatchdog, attachAiAnalyser, fallbackBrowserSpeech, isSpeakerOn, resolveAiSpeech, selectedSpeaker, stopCurrentAudio, stopLiveListening]);

  // ─── Streamed reply audio: sequential chunk player ──────────────────────
  // The streaming chat response (doctors-clinics voice turns) delivers TTS
  // audio as a queue of per-sentence clips instead of one complete blob, so
  // the first sentence can start playing while later ones are still being
  // synthesized. This plays them back-to-back in order, reusing the same
  // watchdog/resolve pattern as the single-clip player above so a dropped
  // "ended" event still can't strand the mic.
  const audioChunkQueueRef = useRef<string[]>([]);
  const audioChunkStreamDoneRef = useRef<boolean>(false);
  const isChunkPlayingRef = useRef<boolean>(false);
  const onAllAudioChunksDoneRef = useRef<(() => void) | null>(null);

  const resetAudioStreamState = useCallback(() => {
    audioChunkQueueRef.current = [];
    audioChunkStreamDoneRef.current = false;
    onAllAudioChunksDoneRef.current = null;
    isChunkPlayingRef.current = false;
  }, []);

  const playNextQueuedChunk = useCallback(() => {
    if (isChunkPlayingRef.current) return;
    const next = audioChunkQueueRef.current.shift();
    if (!next) {
      if (audioChunkStreamDoneRef.current) {
        const cb = onAllAudioChunksDoneRef.current;
        onAllAudioChunksDoneRef.current = null;
        if (cb) cb();
      }
      return;
    }
    isChunkPlayingRef.current = true;
    stopCurrentAudio();
    setIsAiSpeaking(true);
    setSpeechStatusText("AI speaking...");
    try {
      const audio = new Audio(`data:audio/wav;base64,${next}`);
      attachAiAnalyser(audio);
      currentAudioRef.current = audio;
      const advance = () => {
        isChunkPlayingRef.current = false;
        playNextQueuedChunk();
      };
      audio.onended = () => resolveAiSpeech(advance);
      audio.onerror = () => resolveAiSpeech(advance); // skip a bad chunk, keep the sequence going
      audio.onloadedmetadata = () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          armAiSpeechWatchdog(advance, audio.duration * 1000 + 800);
        }
      };
      armAiSpeechWatchdog(advance);
      audio.play().catch(() => resolveAiSpeech(advance));
    } catch {
      isChunkPlayingRef.current = false;
      playNextQueuedChunk();
    }
  }, [armAiSpeechWatchdog, attachAiAnalyser, resolveAiSpeech, stopCurrentAudio]);

  const enqueueAudioChunk = useCallback((audioBase64: string) => {
    audioChunkQueueRef.current.push(audioBase64);
    playNextQueuedChunk();
  }, [playNextQueuedChunk]);

  // Call once the "done" event arrives — runs onAllDone immediately if every
  // queued chunk has already finished playing, otherwise defers it until the
  // last one does.
  const finishAudioStream = useCallback((onAllDone: () => void) => {
    audioChunkStreamDoneRef.current = true;
    if (audioChunkQueueRef.current.length === 0 && !isChunkPlayingRef.current) {
      onAllDone();
    } else {
      onAllAudioChunksDoneRef.current = onAllDone;
    }
  }, []);

  // Dispatch Webhook
  const triggerWebhookDispatch = useCallback(async (payloadExtracted: any, history: IndustryMessage[]) => {
    try {
      const currentExt = extractedDataRef.current || {};
      const merged = { ...currentExt, ...payloadExtracted };
      const fallbackRefId = merged.appointment_id || (activeIndustry.id === "automobile" ? `SB-${Math.floor(10000 + Math.random() * 90000)}` : `SUN-${Math.floor(10000 + Math.random() * 90000)}`);

      const isAutomobile = activeIndustry.id === "automobile";
      const webhookPayload = {
        event: isAutomobile ? "automobile.lead_captured" : "namuste.ai_demo.lead_captured",
        timestamp: new Date().toISOString(),
        industry: {
          id: activeIndustry.id,
          name: activeIndustry.name,
          brand: activeIndustry.brandName,
        },
        lead: {
          name: merged.name || (isAutomobile ? "Customer" : "Patient"),
          mobile: merged.mobile || "Unknown Number",
          dob: merged.dob || "Not Provided",
          department: merged.department || (isAutomobile ? (merged.serviceType || "Automobile Service") : "Dermatology"),
          assignedDoctorOrLead: merged.doctor || (isAutomobile ? (merged.dealerLocation || "Apex Motors Workshop Advisor") : (merged.department === "Dermatology" ? "Dr. Pooja Gupta" : "General Specialist")),
          confirmedSlot: merged.slot || "Upcoming",
          intent: merged.intent || (isAutomobile ? "Automobile Service & Test Drive Booking" : "Appointment Booking"),
          summary: merged.summary || "Full intake completed via Namuste AI",
          referenceId: fallbackRefId,
          vehicleModel: merged.vehicleModel,
          registrationNumber: merged.registrationNumber,
          serviceType: merged.serviceType,
          dealerLocation: merged.dealerLocation,
        },
        transcript: history.map((m) => `[${m.speaker.toUpperCase()}]: ${m.text}`),
        metadata: {
          channel: "voice-ai-telephony",
          durationSeconds: callDuration,
          token: "CCH-014",
        },
      };

      const res = await fetch("/api/ai-demo/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (res.ok) {
        setWebhookSent(true);
      }
    } catch (err) {
      console.warn("Webhook dispatch warning:", err);
    }
  }, [activeIndustry, callDuration]);

  // ─── processConversationTurn: accepts optional authoritative Sarvam language code ───
  const processConversationTurn = useCallback(async (rawText: string, sarvamLang = "", sttLanguageProbability: number | null = null) => {
    if (!rawText || rawText.trim() === "" || isProcessing) return;

    const userText = rawText.trim();
    setIsProcessing(true);
    stopCurrentAudio();
    stopLiveListening();

    const currentHistory = conversationHistoryRef.current;
    const currentExt = extractedDataRef.current;

    const userMsg: IndustryMessage = {
      speaker: "user",
      text: userText,
      langLabel: "You",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedHistoryWithUser = [...currentHistory, userMsg];
    setConversationHistory(updatedHistoryWithUser);
    conversationHistoryRef.current = updatedHistoryWithUser;
    setLiveUserTranscript("");

    const isVoiceTurn = channel === "voice" || isCallActive;
    let failureReason = "";

    try {
      const res = await fetch("/api/ai-demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId: selectedIndustryId,
          messages: updatedHistoryWithUser,
          userMessage: userText,
          currentExtracted: currentExt,
          generateAudio: isVoiceTurn && isSpeakerOn,
          speaker: selectedSpeakerRef.current || selectedSpeaker || "ritu",
          sarvamLanguageCode: sarvamLang, // Authoritative language from Sarvam STT
          sttLanguageProbability, // Sarvam STT's confidence in that language claim — drives language stickiness server-side
        }),
      });

      if (!res.ok) {
        failureReason = res.status === 429
          ? "Too many requests — please wait a moment and try again."
          : `Server error (${res.status}). Please try again.`;
      }

      if (res.ok) {
        // Applies the reply's text/history/CRM/webhook side effects. Shared by
        // both response shapes below — a single complete JSON reply, or the
        // "text" event of a streamed reply — so behavior is identical either
        // way, this just runs the instant the reply text is known rather than
        // waiting for its audio too.
        const applyReplyData = (data: any) => {
          const aiMsg: IndustryMessage = {
            speaker: "ai",
            text: data.reply,
            // The authoritative language this turn was generated in — stored
            // so a later turn's language-stickiness check can read it
            // directly instead of re-guessing from the stored text. That
            // re-guess used to be the ONLY option, matching the reply against
            // a fixed ~60-word Hinglish keyword list — but GPT's romanized
            // Hindi replies vary in phrasing and routinely use common words
            // ("hai", "hain", "kar", "mein", "raha") that aren't on that
            // list, so a perfectly genuine Hindi reply could silently be
            // misread as English, breaking stickiness for the very next turn.
            language: data.languageCode || "",
            langLabel: (
              data.languageCode?.startsWith("hi") ? "Hindi" :
              data.languageCode?.startsWith("ta") ? "Tamil" :
              data.languageCode?.startsWith("te") ? "Telugu" :
              data.languageCode?.startsWith("bn") ? "Bengali" :
              data.languageCode?.startsWith("ml") ? "Malayalam" :
              data.languageCode?.startsWith("kn") ? "Kannada" :
              data.languageCode?.startsWith("pa") ? "Punjabi" :
              data.languageCode?.startsWith("gu") ? "Gujarati" :
              data.languageCode?.startsWith("or") ? "Odia" : "English"
            ),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          const finalHistory = [...updatedHistoryWithUser, aiMsg];
          setConversationHistory(finalHistory);
          conversationHistoryRef.current = finalHistory;

          if (data.extracted) {
            setExtractedData(data.extracted);
            extractedDataRef.current = data.extracted;
          }
          if (data.languageCode) {
            setCurrentLanguageCode(data.languageCode);
          }

          // Trigger webhook dispatch when booking is confirmed / completed
          const bookingJustCompleted = !!(data.isComplete || data.step === "confirmation_complete" || data.extracted?.confirmed);
          if (bookingJustCompleted && !webhookSentRef.current) {
            webhookSentRef.current = true;
            triggerWebhookDispatch({ ...currentExt, ...(data.extracted || {}) }, finalHistory);
          }

          setIsProcessing(false);
          const callEnded = !!data.callEnded;
          const resumeListeningAfterTurn = () => {
            // Caller said bye/goodbye/hang up — end the call right away instead
            // of reopening the mic or waiting on the post-booking grace timer.
            if (callEnded) {
              if (isCallActiveRef.current) handleEndCall();
              return;
            }
            if (isCallActiveRef.current && !isMutedRef.current) {
              startLiveListening();
              if (bookingJustCompleted) armAutoEndCall();
            }
          };

          return { bookingJustCompleted, callEnded, resumeListeningAfterTurn };
        };

        // Plays exactly one complete reply audio clip → instant Browser TTS
        // fallback. Unchanged logic from before streaming existed — used as-is
        // for every non-streamed response (every industry other than
        // doctors-clinics, and any doctors-clinics turn without audio).
        const playSingleAudioAndContinue = async (data: any, resumeListeningAfterTurn: () => void) => {
          if (isVoiceTurn && isSpeakerOn) {
            if (data.audioBase64) {
              stopCurrentAudio();
              setIsAiSpeaking(true);
              setSpeechStatusText("AI speaking...");
              try {
                const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
                attachAiAnalyser(audio);
                currentAudioRef.current = audio;
                const resumeAfterAudio = () => {
                  stopCurrentAudio();
                  setIsAiSpeaking(false);
                  const bookingJustCompleted = !!(data.isComplete || data.step === "confirmation_complete" || data.extracted?.confirmed);
                  if (!bookingJustCompleted) setSpeechStatusText("Listening to you...");
                  resumeListeningAfterTurn();
                };
                audio.onended = () => resolveAiSpeech(resumeAfterAudio);
                audio.onerror = () => {
                  // Audio decode error — immediately fall back to browser TTS
                  resolveAiSpeech(() => {
                    speakTextAudible(data.reply, data.languageCode, resumeListeningAfterTurn, data.tone);
                  });
                };
                audio.onloadedmetadata = () => {
                  if (isFinite(audio.duration) && audio.duration > 0) {
                    armAiSpeechWatchdog(resumeAfterAudio, audio.duration * 1000 + 800);
                  }
                };
                armAiSpeechWatchdog(resumeAfterAudio); // coarse ceiling until duration is known
                await audio.play();
                return;
              } catch (audioErr) {
                console.warn("Sarvam audio play error, falling to browser TTS:", audioErr);
              }
            }

            // Sarvam returned null or failed — immediately use browser TTS (zero extra wait)
            speakTextAudible(data.reply, data.languageCode, resumeListeningAfterTurn, data.tone);
          } else if (data.callEnded && isCallActiveRef.current) {
            // No audio playback path taken (speaker off / text channel) —
            // still honor the farewell and end the call.
            handleEndCall();
          }
        };

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("x-ndjson")) {
          // ── Streamed reply (doctors-clinics voice turns only) ───────────────
          // Text/CRM/webhook side effects apply the instant the "text" event
          // arrives — before any audio is ready — via the exact same
          // applyReplyData() the non-streaming path uses below. Each
          // "audio_chunk" plays as soon as it's synthesized instead of
          // waiting for the whole reply's audio.
          resetAudioStreamState();
          let replyApplied = false;
          let resumeListeningAfterTurn: (() => void) | null = null;

          await readNdjsonLines(res, (evt) => {
            if (evt.type === "text") {
              replyApplied = true;
              const result = applyReplyData(evt);
              resumeListeningAfterTurn = result.resumeListeningAfterTurn;
              if (!(isVoiceTurn && isSpeakerOn)) {
                // No audio will follow (text mode / speaker off) — finish now,
                // matching playSingleAudioAndContinue's non-audio branch.
                if (evt.callEnded && isCallActiveRef.current) {
                  handleEndCall();
                } else {
                  resumeListeningAfterTurn();
                }
              }
            } else if (evt.type === "audio_chunk" && evt.audioBase64 && isVoiceTurn && isSpeakerOn) {
              enqueueAudioChunk(evt.audioBase64);
            } else if (evt.type === "done" && isVoiceTurn && isSpeakerOn && resumeListeningAfterTurn) {
              const resume = resumeListeningAfterTurn;
              finishAudioStream(() => {
                stopCurrentAudio();
                setIsAiSpeaking(false);
                resume();
              });
            }
          });

          if (!replyApplied) {
            failureReason = failureReason || "The assistant didn't return a valid reply. Please try again.";
          } else {
            return;
          }
        } else {
          const data = await res.json();
          if (data.success && data.reply) {
            const { resumeListeningAfterTurn } = applyReplyData(data);
            await playSingleAudioAndContinue(data, resumeListeningAfterTurn);
            return;
          }
          // Response was ok but didn't carry a usable reply — treat as a failure below
          failureReason = failureReason || "The assistant didn't return a valid reply. Please try again.";
        }
      }
    } catch (e) {
      console.warn("Turn processing error fallback:", e);
      failureReason = "Connection error — please try again.";
    }

    // A prior implementation fell through to here silently on ANY failure —
    // no visible error, and critically no resumption of listening, so a live
    // call would just go dead with zero feedback. Surface the failure and
    // keep the conversation loop alive instead.
    setIsProcessing(false);
    setSpeechStatusText(`Error: ${failureReason || "Something went wrong. Please try again."}`);
    if (isVoiceTurn && isCallActiveRef.current && !isMutedRef.current) {
      startLiveListening();
    }
  }, [armAiSpeechWatchdog, attachAiAnalyser, channel, enqueueAudioChunk, finishAudioStream, isCallActive, isMuted, isProcessing, isSpeakerOn, resetAudioStreamState, resolveAiSpeech, selectedIndustryId, selectedSpeaker, speakTextAudible, stopCurrentAudio, stopLiveListening, triggerWebhookDispatch]);


  // Mic capture via MediaRecorder + amplitude-based voice activity detection (VAD).
  // Replaces the browser's native SpeechRecognition, which (a) only supports
  // whatever language/dialect quality the OS engine ships with — poor for
  // Hindi/regional languages — and (b) locked recognition.lang to *last
  // turn's* detected language, so a mid-call language switch was always one
  // turn late. Recording is sent to /api/ai-demo/speech (Whisper STT) once
  // the VAD detects ~700ms of silence after speech, and Whisper's own
  // detected language becomes the authoritative signal passed into
  // processConversationTurn — closing both gaps at once.
  const startLiveListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSpeechStatusText("Error: Microphone capture not supported in this browser. Use chat mode.");
      return;
    }

    // Discard any stale in-progress capture before starting a fresh one.
    stopLiveListening();

    try {
      // getUserMedia can hang indefinitely — neither resolving nor rejecting —
      // if the OS mic device hasn't fully released from a just-ended recording
      // session. Without a hard timeout, that hang is completely invisible:
      // no error, mic just never comes back. Race it against a timeout so a
      // stuck acquisition always surfaces as a real, catchable error instead.
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          // Browser/OS-level noise suppression, echo cancellation, and gain
          // normalization — these are standard, well-supported constraints
          // that meaningfully cut background noise before it ever reaches
          // the VAD or STT, rather than trying to filter it after the fact.
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getUserMedia timed out after 6s — mic device may be stuck busy from the previous turn")), 6000)
        ),
      ]);
      mediaStreamRef.current = stream;

      const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      if (audioContext.state === "suspended") {
        try { await audioContext.resume(); } catch (_) {}
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      speechDetectedRef.current = false;
      pendingFinalizeRef.current = false;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const shouldFinalize = pendingFinalizeRef.current;
        pendingFinalizeRef.current = false;
        const chunks = recordedChunksRef.current;
        recordedChunksRef.current = [];

        stream.getTracks().forEach((t) => t.stop());
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
        if (audioContextRef.current === audioContext) {
          try { await audioContext.close(); } catch (_) {}
          audioContextRef.current = null;
        }

        if (!shouldFinalize || chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        if (blob.size < 2000) {
          // Too short to be meaningful speech (VAD false-positive on noise) — just resume listening
          if (isCallActiveRef.current && !isMutedRef.current) startLiveListening();
          return;
        }

        setSpeechStatusText("Transcribing...");
        try {
          const base64Audio = await blobToBase64(blob);
          const res = await fetch("/api/ai-demo/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "stt",
              audioBase64: base64Audio,
              // In Auto mode (no manual override), hint Sarvam with whatever
              // language is already established rather than "unknown" —
              // narrows what it's listening for instead of blind-guessing
              // fresh on every single turn.
              languageCode: manualLanguageHintRef.current || currentLanguageCodeRef.current,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.transcript && data.transcript.trim()) {
              setLiveUserTranscript(data.transcript.trim());
              processConversationTurn(
                data.transcript.trim(),
                data.detectedLanguageCode || "",
                typeof data.languageProbability === "number" ? data.languageProbability : null
              );
              return;
            }
          }
        } catch (err) {
          console.warn("STT request failed:", err);
        }

        // No usable transcript came back — resume listening rather than hanging silently
        if (isCallActiveRef.current && !isMutedRef.current) {
          setSpeechStatusText("Didn't catch that — listening again...");
          startLiveListening();
        }
      };

      recorder.start(250); // flush chunks every 250ms so short utterances still have data on stop()

      setIsUserSpeaking(false);
      setSpeechStatusText("Listening to you... (Speak naturally)");

      const dataArray = new Uint8Array(analyser.fftSize);
      // Raised from 0.02, and now paired with a sustained-frames requirement
      // below — a single loud frame (a door, a cough, distant noise) used to
      // be enough to start capturing a "turn" and send it to STT as if the
      // caller had spoken, which is exactly what was corrupting the
      // conversation with background noise.
      const SPEECH_RMS_THRESHOLD = 0.028;
      // Require ~150ms of continuous energy above threshold before treating
      // it as the caller actually starting to talk, not just a brief blip.
      const REQUIRED_CONSECUTIVE_SPEECH_FRAMES = 9;
      // Raised from 700ms — that was cutting people off during completely
      // normal mid-sentence pauses (recalling a number, a breath, an "umm").
      // The timer already correctly cancels and lets recording continue the
      // instant speech resumes (see the rms > threshold branch above), so
      // this only controls how long a genuine pause has to last before it's
      // treated as "done talking" — 1100ms gives real breathing room while
      // still being far snappier than the original fixed 2200ms wait.
      const SILENCE_MS = 1100;
      const MAX_RECORDING_MS = 20000;
      const startedAt = Date.now();
      let consecutiveSpeechFrames = 0;

      const vadTick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        if (rms > SPEECH_RMS_THRESHOLD) {
          consecutiveSpeechFrames++;
          if (!speechDetectedRef.current && consecutiveSpeechFrames >= REQUIRED_CONSECUTIVE_SPEECH_FRAMES) {
            speechDetectedRef.current = true;
            setIsUserSpeaking(true);
            // Caller is speaking again after a confirmed booking — they get
            // to finish, not get cut off by the auto-hangup timer.
            if (autoEndCallTimeoutRef.current) {
              clearTimeout(autoEndCallTimeoutRef.current);
              autoEndCallTimeoutRef.current = null;
            }
          }
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else {
          // Energy dropped — a blip that didn't sustain long enough resets
          // the counter instead of slowly accumulating across noise gaps.
          consecutiveSpeechFrames = 0;
        }

        if (!(rms > SPEECH_RMS_THRESHOLD) && speechDetectedRef.current && !silenceTimeoutRef.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            pendingFinalizeRef.current = true;
            setIsUserSpeaking(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              try { mediaRecorderRef.current.stop(); } catch (_) {}
            }
          }, SILENCE_MS);
        }

        if (Date.now() - startedAt > MAX_RECORDING_MS) {
          pendingFinalizeRef.current = speechDetectedRef.current;
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try { mediaRecorderRef.current.stop(); } catch (_) {}
          }
          return;
        }

        vadRafRef.current = requestAnimationFrame(vadTick);
      };
      vadRafRef.current = requestAnimationFrame(vadTick);
    } catch (err: any) {
      console.warn("Could not start microphone capture:", err);
      // Surface the ACTUAL error instead of a hardcoded guess — a previous
      // version always said "permission denied" here even when the real cause
      // was something else entirely (e.g. a stuck device, or the new 6s
      // timeout above), which actively hid what was really happening.
      const name = err?.name || "";
      const friendly =
        name === "NotAllowedError" ? "Microphone permission denied. Use chat mode instead."
        : name === "NotFoundError" ? "No microphone found on this device."
        : name === "NotReadableError" ? "Microphone is busy or unavailable (may be in use by another app/tab)."
        : err?.message?.includes("timed out") ? "Microphone didn't respond in time — device may still be busy from the previous turn. Retrying..."
        : `Microphone error: ${err?.message || name || "unknown"}.`;
      setSpeechStatusText(`Error: ${friendly}`);
      setIsUserSpeaking(false);

      // A stuck/busy device is often transient — retry once automatically
      // instead of leaving the call permanently dead on a timeout.
      if (err?.message?.includes("timed out") && isCallActiveRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (isCallActiveRef.current && !isMutedRef.current) startLiveListening();
        }, 1000);
      }
    }
  }, [processConversationTurn, stopLiveListening]);


  const handleStartCall = async () => {
    setIsConnecting(true);
    setSpeechStatusText("Connecting to AI Receptionist...");
    setCallDuration(0);
    setLiveUserTranscript("");
    setIsMuted(false);
    webhookSentRef.current = false;
    setWebhookSent(false);

    await new Promise((r) => setTimeout(r, 600));

    setIsCallActive(true);
    setIsConnecting(false);

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    const welcomeMsg: IndustryMessage = {
      speaker: "ai",
      text: activeIndustry.initialGreetingEnglish,
      langLabel: "English",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const initialHistory = [welcomeMsg];
    setConversationHistory(initialHistory);
    conversationHistoryRef.current = initialHistory;

    speakTextAudible(activeIndustry.initialGreetingEnglish, "en-IN", () => {
      startLiveListening();
    }, "greeting");
  };

  const handleEndCall = () => {
    if (autoEndCallTimeoutRef.current) {
      clearTimeout(autoEndCallTimeoutRef.current);
      autoEndCallTimeoutRef.current = null;
    }
    stopCurrentAudio();
    stopLiveListening();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsCallActive(false);
    setSpeechStatusText("Call ended. Click to call again.");
  };

  // ─── Auto-hangup after a confirmed booking ──────────────────────────────
  // Once the AI reports isComplete (booking confirmed / webhook dispatched),
  // the call doesn't need to stay open indefinitely — but hanging up the
  // instant the confirmation audio ends would cut off a caller who wanted to
  // ask one more thing. Instead: keep listening as normal, but arm a timer
  // that ends the call automatically if nothing more is said. Any real
  // speech detected before it fires cancels it — see the VAD tick's
  // speechDetectedRef transition in startLiveListening.
  const AUTO_END_CALL_DELAY_MS = 8000;

  const cancelAutoEndCall = useCallback(() => {
    if (autoEndCallTimeoutRef.current) {
      clearTimeout(autoEndCallTimeoutRef.current);
      autoEndCallTimeoutRef.current = null;
    }
  }, []);

  const armAutoEndCall = useCallback(() => {
    cancelAutoEndCall();
    setSpeechStatusText("Booking confirmed — call will end automatically shortly. Speak now to continue.");
    autoEndCallTimeoutRef.current = setTimeout(() => {
      autoEndCallTimeoutRef.current = null;
      handleEndCall();
    }, AUTO_END_CALL_DELAY_MS);
  }, [cancelAutoEndCall]);

  const handleReset = () => {
    handleEndCall();
    setConversationHistory([]);
    conversationHistoryRef.current = [];
    setExtractedData({});
    extractedDataRef.current = {};
    webhookSentRef.current = false;
    setWebhookSent(false);
    setLiveUserTranscript("");
    setChatInput("");
    setSpeechStatusText("Click to start voice call");
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const copyPayloadToClipboard = () => {
    const payload = JSON.stringify({
      lead: extractedData,
      transcriptCount: conversationHistory.length,
      industry: activeIndustry.name,
      status: webhookSent ? "Dispatched" : "In Progress",
    }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Preset quick prompt samples dynamically tailored to the selected industry
  const getIndustrySamplePrompts = (ind: IndustryFlow) => {
    switch (ind.id) {
      case "lawyers":
        return [
          { label: "Intake (English)", text: "Hi, I am Priya Sen, contact 9811223344. Need legal consultation for property dispute." },
          { label: "Ask Practice Areas", text: "What legal practice areas and consultation formats do you offer?" },
          { label: "Confirm Video Call", text: "Yes, Thursday 4:00 PM video consultation works for me." },
        ];
      case "chartered-accountants":
        return [
          { label: "Intake (Hinglish)", text: "Amit Patel, mobile 9900112233. Private Limited GST return aur audit filing consult karna tha." },
          { label: "Ask Audit Scope", text: "What are your corporate tax audit and ITR filing charges?" },
          { label: "Lock Review Slot", text: "Kal 2:30 PM ka review call schedule kar dijiye." },
        ];
      case "consultants":
        return [
          { label: "Intake (English)", text: "Karan Malhotra, Founder at TechNova, phone 9765432100. Looking for B2B SaaS GTM strategy." },
          { label: "Ask Advisory Scope", text: "Can you explain your growth strategy and scaling frameworks?" },
          { label: "Book Strategy Session", text: "Friday 11:00 AM discovery slot works perfectly." },
        ];
      case "architects":
        return [
          { label: "Intake (English)", text: "Neha Kapoor, phone 9820011223. We have a 3BHK in Indiranagar for interior renovation." },
          { label: "Ask Portfolio", text: "What is your typical interior design budget and site inspection process?" },
          { label: "Schedule Inspection", text: "Saturday 3:00 PM site inspection works for me." },
        ];
      case "real-estate":
        return [
          { label: "Intake (Hinglish)", text: "Sunita Roy, 9845012345. Looking for a 3 BHK luxury flat in 1.5 Cr budget." },
          { label: "Ask Pricing & Layout", text: "What configurations, carpet area and pricing sheets are available?" },
          { label: "Issue VIP Tour Pass", text: "Haan, Sunday 11:30 AM model flat tour book kar dijiye." },
        ];
      case "education":
        return [
          { label: "Student Intake", text: "Student name is Rohan Gupta, parent mobile 9711002233. Target is JEE 2026." },
          { label: "Provide DOB/Grade", text: "DOB 12th June 2008, currently in Grade 11." },
          { label: "Register Demo Class", text: "Yes, register him for Saturday 10:00 AM demo masterclass." },
        ];
      case "distributors":
        return [
          { label: "Dealer Intake", text: "Sri Krishna Traders, Manoj Kumar, phone 9888776655. Electrical fittings SKU #8420 stock chahiye." },
          { label: "Check Stock & Dispatch", text: "How many units of SKU #8420 are in stock for tomorrow morning dispatch?" },
          { label: "Lock 100 Boxes", text: "Haan, 100 boxes reserve karke pro-forma invoice bhej do." },
        ];
      case "agriculture":
        return [
          { label: "Farmer Intake", text: "Mera naam Rameshwar Yadav hai, Hooghly district. Dhaan ki fasal ke liye khad ka schedule chahiye. Phone 9431098765." },
          { label: "Ask Nearest Dealer", text: "Hooghly mandi mein kaun se dealer ke paas stock available hai?" },
          { label: "Dispatch Advisory", text: "Haan, poora advisory schedule WhatsApp aur SMS par bhej dijiye." },
        ];
      case "research":
        return [
          { label: "Cohort Intake", text: "Dr. Ananya Ray, mobile 9830055443. Enquiring about the Cardiology cohort study." },
          { label: "Verify DOB & Hospital", text: "DOB 24 November 1988, Apollo Gleneagles Hospital." },
          { label: "Qualify & Dispatch Protocol", text: "Eligible for Cohort C-104! Please send IRB consent form." },
        ];
      case "automobile":
        return [
          { label: "Book Service", text: "I need to book a 30,000 km periodic service for my Hyundai Creta DL01AB1234. Name is Amit Sharma, 9876512345." },
          { label: "Book Test Drive", text: "Hi, I'm interested in a test drive for the Mahindra XUV700 this Saturday at your Gurgaon showroom." },
          { label: "Check Job Card", text: "Can you check the repair status for vehicle DL01AB1234?" },
          { label: "Service Cost Estimate", text: "What is the approximate cost for a 40,000 km service for Nexon EV?" },
          { label: "Roadside Assistance", text: "My car broke down near IFFCO Chowk Gurgaon with engine overheating. Please send roadside assistance!" },
          { label: "Budget Recommender", text: "Suggest an automatic SUV under 15 Lakhs for city commute." },
        ];
      default:
        return [
          { label: "Hindi Intake", text: "Mera naam Rahul Verma hai aur mobile number 9812345678 hai" },
          { label: "English Intake", text: "My name is Ankush Sharma and my contact is 9876543210" },
          { label: "Provide DOB", text: "Meri date of birth 14 August 1992 hai" },
          { label: "Ask Services & Timings", text: "What departments and OPD timings are available?" },
          { label: "Book 10:30 (Conflict)", text: "Kal subah 10:30 AM ka appointment chahiye" },
          { label: "Confirm 11:45 AM", text: "Tomorrow 11:45 AM slot works for me" },
        ];
    }
  };

  const samplePrompts = getIndustrySamplePrompts(activeIndustry);

  // Drives the intake-progress badge — same 5 structured fields the floating
  // badges below render, just counted for a "3/5 captured" readout.
  const isAutomobile = activeIndustry.id === "automobile";
  const crmFieldsTotal = 5;
  const crmFieldsFilled = isAutomobile
    ? [
        !!extractedData.name,
        !!extractedData.mobile,
        !!(extractedData.vehicleModel || extractedData.registrationNumber),
        !!(extractedData.serviceType || extractedData.dealerLocation || extractedData.intent),
        !!extractedData.slot,
      ].filter(Boolean).length
    : [
        !!extractedData.name,
        !!extractedData.mobile,
        activeIndustry.requiresDob ? !!extractedData.dob : true,
        !!(extractedData.department || extractedData.doctor),
        !!extractedData.slot,
      ].filter(Boolean).length;

  // Captured customer data as floating annotation badges — shown either
  // absolutely positioned around the orb (voice mode) or as a plain wrapped
  // row above the transcript (chat mode, which has no orb to float around).
  // Defined once and reused in both branches below so the two never drift.
  const dataBadgesLayer = (
    <div className={`floating-badges-layer${channel === "chat" ? " chat-mode" : ""}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      <FloatingDataBadge
        className="floating-badge"
        style={{ top: "0%", left: "50%", transform: "translateX(-50%)", flexDirection: "row", alignItems: "center" }}
        icon={<CircularProgress filled={crmFieldsFilled} total={crmFieldsTotal} gradientId={crmGradientId} />}
        label={isAutomobile ? "Auto Intake Progress" : "Intake Progress"}
        value={webhookSent ? "Webhook Synced" : crmFieldsFilled === crmFieldsTotal ? "Ready to confirm" : "Capturing details..."}
        color="#9BEA16"
        filled={crmFieldsFilled > 0}
        row
      />
      <FloatingDataBadge
        className="floating-badge"
        style={{ top: "14%", left: "0%" }}
        icon={<User size={11} color={(extractedData.name || extractedData.registrationNumber) ? "#9BEA16" : "#71717A"} />}
        label={isAutomobile ? (extractedData.registrationNumber ? "Reg / Plate" : "Customer") : "Name"}
        value={isAutomobile ? (extractedData.name || extractedData.registrationNumber) : extractedData.name}
        subvalue={isAutomobile ? (extractedData.name && extractedData.registrationNumber ? extractedData.registrationNumber : "") : extractedData.dob}
        placeholder="Listening..."
        color="#9BEA16"
        filled={!!(extractedData.name || (isAutomobile && extractedData.registrationNumber))}
      />
      <FloatingDataBadge
        className="floating-badge"
        style={{ top: "14%", right: "0%" }}
        icon={<Phone size={11} color={extractedData.mobile ? "#38BDF8" : "#71717A"} />}
        label="Mobile"
        value={extractedData.mobile}
        placeholder="—"
        color="#38BDF8"
        filled={!!extractedData.mobile}
      />
      <FloatingDataBadge
        className="floating-badge"
        style={{ bottom: "18%", left: "0%" }}
        icon={isAutomobile ? <Car size={11} color={(extractedData.vehicleModel || extractedData.serviceType) ? "#EF4444" : "#71717A"} /> : <Stethoscope size={11} color={(extractedData.department || extractedData.doctor) ? "#8B5CF6" : "#71717A"} />}
        label={isAutomobile ? "Vehicle / Action" : "Department"}
        value={isAutomobile ? (extractedData.vehicleModel || extractedData.serviceType || extractedData.intent) : (extractedData.department || extractedData.doctor)}
        subvalue={isAutomobile ? extractedData.dealerLocation : undefined}
        placeholder="Awaiting..."
        color={isAutomobile ? "#EF4444" : "#8B5CF6"}
        filled={!!(isAutomobile ? (extractedData.vehicleModel || extractedData.serviceType || extractedData.intent) : (extractedData.department || extractedData.doctor))}
      />
      <FloatingDataBadge
        className="floating-badge"
        style={{ bottom: "18%", right: "0%" }}
        icon={<Clock size={11} color={extractedData.slot ? "#22D3EE" : "#71717A"} />}
        label={extractedData.confirmed ? "Confirmed" : "Slot"}
        value={extractedData.slot}
        placeholder="Awaiting..."
        color={extractedData.confirmed ? "#9BEA16" : "#22D3EE"}
        filled={!!extractedData.slot}
      />
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", padding: "0", boxSizing: "border-box", overflow: "hidden" }}>
      {/* 1. TOP INDUSTRY NAVIGATION CAROUSEL (Horizontal Swipe Carousel) */}
      {!hideIndustrySelector && !lockedIndustryId && (
        <div
          className="touch-scroll"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "10px",
            width: "100%",
            boxSizing: "border-box",
            scrollSnapType: "x mandatory",
          }}
        >
          {Object.values(INDUSTRY_FLOWS).map((ind) => {
            const isSelected = selectedIndustryId === ind.id;
            const indComingSoon = !!ind.comingSoon;
            return (
              <button
                key={ind.id}
                onClick={() => {
                  if (ind.id !== selectedIndustryId) {
                    setSelectedIndustryId(ind.id);
                    handleReset();
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 10px 6px 12px",
                  borderRadius: "999px",
                  fontSize: "11.5px",
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected
                    ? (indComingSoon ? AI_GRADIENT_SOFT : "rgba(155, 234, 22, 0.15)")
                    : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${isSelected ? (indComingSoon ? "rgba(139, 92, 246, 0.6)" : "#9BEA16") : "rgba(255, 255, 255, 0.08)"}`,
                  color: isSelected ? (indComingSoon ? "#C4B5FD" : "#9BEA16") : indComingSoon ? "#71717A" : "#A1A1AA",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  opacity: !isSelected && indComingSoon ? 0.75 : 1,
                }}
              >
                <span style={{ display: "flex", alignItems: "center" }}>
                  {ICON_MAP[ind.iconName] || <Briefcase size={12} />}
                </span>
                <span>{ind.name}</span>
                {indComingSoon && (
                  <span
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: "1.5px 5px",
                      borderRadius: "999px",
                      background: isSelected ? "rgba(139, 92, 246, 0.3)" : "rgba(255, 255, 255, 0.06)",
                      color: isSelected ? "#E0D4FF" : "#8E8E93",
                    }}
                  >
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isComingSoon ? (
        <ComingSoonPanel industry={activeIndustry} />
      ) : (
      <>
      {/* 2. INDUSTRY HEADER & CONVERSATION FLOW — no card chrome, floats
          directly on the page like everything else in this console now. */}
      <div
        className="industry-header-card"
        style={{
          padding: "0 4px",
          marginBottom: "22px",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          className="header-top-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          {/* Brand Info with Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(155, 234, 22, 0.12)",
                border: "1px solid rgba(155, 234, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9BEA16",
                flexShrink: 0,
              }}
            >
              {ICON_MAP[activeIndustry.iconName] || <Sparkles size={18} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#F5F5F0", whiteSpace: "nowrap" }}>
                  {activeIndustry.brandName}
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#8E8E93",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeIndustry.requiresDob ? "Name + Phone + DOB" : "Name + Phone"}
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "11.5px",
                  color: "#8E8E93",
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeIndustry.tagline}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Reset Button — the switcher is now a real
              shadcn/ui Tabs (Radix underneath), so it gets arrow-key
              navigation and proper tab semantics for free, styled to keep
              the exact solid-lime "pill" look the rest of the console uses. */}
          <div className="header-action-controls" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <Tabs value={channel} onValueChange={(v) => setChannel(v as "voice" | "chat")}>
              <TabsList
                variant="line"
                className="!h-auto !gap-0 !rounded-full !border !border-white/10 !bg-black/40 !p-[2px]"
              >
                <TabsTrigger
                  value="voice"
                  className="!rounded-full !border-0 !px-3 !py-[5px] !text-[11px] !font-semibold !text-[#A1A1AA] data-active:!bg-[#9BEA16] data-active:!text-black data-active:after:!opacity-0"
                >
                  <Phone size={11} />
                  <span>Voice</span>
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="!rounded-full !border-0 !px-3 !py-[5px] !text-[11px] !font-semibold !text-[#A1A1AA] data-active:!bg-[#9BEA16] data-active:!text-black data-active:after:!opacity-0"
                >
                  <MessageSquare size={11} />
                  <span>Chat</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <button
              onClick={handleReset}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 10px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#8E8E93",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Conversation-flow breadcrumb — dots joined by a line that fills in
            as steps complete, not four separate little boxes. */}
        <div className="stepper-grid" style={{ display: "flex", alignItems: "center", width: "100%" }}>
          {[
            { step: 1, label: "Greeting", done: conversationHistory.length >= 1 },
            { step: 2, label: "Intake", done: !!extractedData.name && !!extractedData.mobile },
            { step: 3, label: "Slots", done: conversationHistory.length >= 3 },
            { step: 4, label: "Sync", done: webhookSent },
          ].map((s, i, arr) => (
            <React.Fragment key={s.step}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: s.done ? "#9BEA16" : "transparent",
                    border: `1.5px solid ${s.done ? "#9BEA16" : "rgba(255, 255, 255, 0.2)"}`,
                    color: "#000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {s.done ? "✓" : s.step}
                </span>
                <span
                  className="stepper-label"
                  style={{
                    fontSize: "11px",
                    color: s.done ? "#F5F5F0" : "#71717A",
                    fontWeight: s.done ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "1.5px",
                    margin: "0 10px",
                    background: s.done ? "#9BEA16" : "rgba(255, 255, 255, 0.12)",
                    minWidth: "12px",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. FLOATING CONSOLE — no card, no border, no panel. The call
          interface floats directly on the page; captured customer data
          appears as annotation badges around the orb instead of a boxed
          record panel underneath it. */}
      <div
        className="unified-console"
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          maxWidth: "860px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
          {channel === "voice" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
                gap: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Call Status Header & Voice Selector (100% visible & bounded) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  flexWrap: "wrap",
                  gap: "6px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: isCallActive ? "rgba(34, 197, 94, 0.15)" : isConnecting ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${isCallActive ? "rgba(34, 197, 94, 0.4)" : isConnecting ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: isCallActive ? "#4ADE80" : isConnecting ? "#FBBF24" : "#8E8E93",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: isCallActive ? "#4ADE80" : isConnecting ? "#FBBF24" : "#8E8E93",
                    }}
                  />
                  <span>
                    {isConnecting ? "Connecting..." : isCallActive ? `Live • ${formatDuration(callDuration)}` : "Live Voice"}
                  </span>
                </div>

                {/* Voice Persona & Language Mode Pickers — popovers replace the
                    old cramped inline pill rows so native scripts have room
                    to breathe and don't overflow on smaller screens. */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {/* Language Picker — covers all 10 supported languages, not just
                      Hindi/English. Auto-detection is measurably weaker for the
                      lower-resource ones (Punjabi especially), so forcing the language
                      explicitly here also passes a hint straight to Whisper, which
                      meaningfully improves accuracy for exactly the languages that
                      needed it most. */}
                  <Popover
                    open={languagePopoverOpen}
                    onOpenChange={(open) => { setLanguagePopoverOpen(open); if (open) setVoicePopoverOpen(false); }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="crm-picker-trigger"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "999px",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          background: languagePopoverOpen ? "rgba(155, 234, 22, 0.14)" : "rgba(255, 255, 255, 0.04)",
                          border: `1px solid ${languagePopoverOpen ? "rgba(155, 234, 22, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                          color: languagePopoverOpen ? "#9BEA16" : "#D4D0C7",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Globe size={11} />
                        <span>{LANGUAGE_OPTIONS.find((l) => l.id === speechLanguageMode)?.native || "Auto"}</span>
                        <ChevronDown size={11} style={{ transform: languagePopoverOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={8}
                      className="grid w-[260px] grid-cols-2 gap-1 rounded-[14px] border-white/10 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
                    >
                      {LANGUAGE_OPTIONS.map((l) => {
                        const isSelected = speechLanguageMode === l.id;
                        return (
                          <button
                            key={l.id}
                            onClick={() => {
                              setSpeechLanguageMode(l.id);
                              // "auto" clears the hint so Whisper's own detection drives the
                              // language every turn; any specific code forces that language
                              // explicitly, including passing it to Whisper as a hint.
                              manualLanguageHintRef.current = l.id === "auto" ? "" : l.id;
                              if (l.id !== "auto") setCurrentLanguageCode(l.id);
                              setLanguagePopoverOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                              padding: "8px 10px",
                              borderRadius: "9px",
                              background: isSelected ? "rgba(155, 234, 22, 0.12)" : "transparent",
                              border: `1px solid ${isSelected ? "rgba(155, 234, 22, 0.35)" : "transparent"}`,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span>
                              <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: isSelected ? "#9BEA16" : "#F5F5F0" }}>{l.native}</span>
                              <span style={{ display: "block", fontSize: "9.5px", color: "#71717A" }}>{l.english}</span>
                            </span>
                            {isSelected && <Check size={13} color="#9BEA16" />}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>

                  {/* Voice Persona Picker */}
                  <Popover
                    open={voicePopoverOpen}
                    onOpenChange={(open) => { setVoicePopoverOpen(open); if (open) setLanguagePopoverOpen(false); }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="crm-picker-trigger"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px 4px 6px",
                          borderRadius: "999px",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          background: voicePopoverOpen ? AI_GRADIENT_SOFT : "rgba(255, 255, 255, 0.04)",
                          border: `1px solid ${voicePopoverOpen ? "rgba(139, 92, 246, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                          color: voicePopoverOpen ? "#C4B5FD" : "#D4D0C7",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: AI_GRADIENT, flexShrink: 0 }} />
                        <span>{VOICE_PERSONAS.find((v) => v.id === selectedSpeaker)?.label || "Ritu"}</span>
                        <ChevronDown size={11} style={{ transform: voicePopoverOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={8}
                      className="flex w-[230px] flex-col gap-[3px] rounded-[14px] border-white/10 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
                    >
                      {VOICE_PERSONAS.map((vp) => {
                        const isSelected = selectedSpeaker === vp.id;
                        return (
                          <button
                            key={vp.id}
                            onClick={() => { setSelectedSpeaker(vp.id); setVoicePopoverOpen(false); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 10px",
                              borderRadius: "10px",
                              background: isSelected ? AI_GRADIENT_SOFT : "transparent",
                              border: `1px solid ${isSelected ? "rgba(139, 92, 246, 0.4)" : "transparent"}`,
                              cursor: "pointer",
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: AI_GRADIENT,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#fff",
                                flexShrink: 0,
                              }}
                            >
                              {vp.label.charAt(0)}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: isSelected ? "#E0D4FF" : "#F5F5F0" }}>{vp.label}</span>
                              <span style={{ display: "block", fontSize: "10px", color: "#8E8E93" }}>{vp.gender} · {vp.desc}</span>
                            </span>
                            {isSelected && <Check size={13} color="#C4B5FD" style={{ flexShrink: 0 }} />}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Acoustic Orb Visualizer — a big layered "sunset over ocean"
                  waveform fills the background (inspired by voice-AI hero
                  art), with the orb's ambient glow field + mouse-tracked 3D
                  tilt sitting above it, so the centerpiece feels alive even
                  before a call starts, not just a static icon-in-a-circle. */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 0 8px",
                  width: "100%",
                  minHeight: "270px",
                  perspective: "700px",
                }}
              >
                <SpeechWaveform
                  state={isAiSpeaking ? "ai" : isUserSpeaking ? "user" : "idle"}
                  userAnalyserRef={analyserRef}
                  aiAnalyserRef={aiAnalyserRef}
                />

                {dataBadgesLayer}

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "156px",
                    height: "156px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  {/* Soft blurred ambient glow field behind the orb — the
                      "premium halo" that makes the whole thing feel lit from
                      within rather than a flat, hard-edged circle. */}
                  <motion.div
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.94, 1.04, 0.94] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      inset: "10px",
                      borderRadius: "50%",
                      background: isAiSpeaking
                        ? "radial-gradient(circle, rgba(139, 92, 246, 0.55) 0%, transparent 70%)"
                        : isUserSpeaking
                        ? "radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(155, 234, 22, 0.35) 0%, transparent 70%)",
                      filter: "blur(20px)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Tilt-enabled inner stage — everything below reacts to
                      cursor position for a subtle parallax, purely cosmetic. */}
                  <motion.div
                    onMouseMove={handleOrbMouseMove}
                    onMouseLeave={handleOrbMouseLeave}
                    style={{
                      position: "relative",
                      width: "128px",
                      height: "128px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      rotateX: orbRotateX,
                      rotateY: orbRotateY,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Concentric Pulsing Radar Rings (idle, brand lime) */}
                    {!isCallActive && (
                      <>
                        <motion.div
                          animate={{
                            scale: [1, 1.45, 1.85],
                            opacity: [0.55, 0.2, 0],
                          }}
                          transition={{
                            duration: 2.8,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            border: "1.5px solid rgba(155, 234, 22, 0.4)",
                            pointerEvents: "none",
                          }}
                        />
                        <motion.div
                          animate={{
                            scale: [1, 1.3, 1.6],
                            opacity: [0.75, 0.35, 0],
                          }}
                          transition={{
                            duration: 2.8,
                            repeat: Infinity,
                            delay: 1.2,
                            ease: "easeOut",
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            border: "1.5px solid rgba(155, 234, 22, 0.3)",
                            pointerEvents: "none",
                          }}
                        />
                        {/* Slow-rotating dashed ring — idle-only texture layer,
                            blends a hint of the AI gradient in even before a
                            call starts so the two states feel related. */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                          style={{
                            position: "absolute",
                            inset: "-4px",
                            borderRadius: "50%",
                            border: "1px dashed rgba(139, 92, 246, 0.25)",
                            pointerEvents: "none",
                          }}
                        />
                      </>
                    )}

                    {/* Rotating AI-gradient ring while live — the "distinct
                        intelligence layer" cue: brand lime owns the idle state,
                        the violet→cyan gradient owns the moment it's actually
                        thinking/listening. */}
                    {isCallActive && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                        style={{
                          position: "absolute",
                          inset: "-7px",
                          borderRadius: "50%",
                          background: isUserSpeaking
                            ? "conic-gradient(from 0deg, transparent 0%, #38BDF8 25%, #7DD3FC 50%, transparent 75%)"
                            : "conic-gradient(from 0deg, transparent 0%, #8B5CF6 25%, #22D3EE 50%, transparent 75%)",
                          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Central Interactive Orb */}
                    <motion.div
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={!isCallActive ? handleStartCall : undefined}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        cursor: !isCallActive ? "pointer" : "default",
                        overflow: "hidden",
                        background: isAiSpeaking
                          ? AI_GRADIENT_RADIAL
                          : isUserSpeaking
                          ? "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(0, 0, 0, 0.85) 75%)"
                          : "radial-gradient(circle, rgba(155, 234, 22, 0.2) 0%, rgba(18, 18, 20, 0.9) 75%)",
                        border: `1.5px solid ${isAiSpeaking ? "rgba(139, 92, 246, 0.7)" : isUserSpeaking ? "rgba(56, 189, 248, 0.8)" : "rgba(155, 234, 22, 0.45)"}`,
                        boxShadow: isAiSpeaking
                          ? "0 0 40px rgba(139, 92, 246, 0.45), 0 0 80px rgba(34, 211, 238, 0.2)"
                          : isUserSpeaking
                          ? "0 0 40px rgba(56, 189, 248, 0.5), 0 0 80px rgba(56, 189, 248, 0.2)"
                          : "0 0 35px rgba(155, 234, 22, 0.35), 0 0 70px rgba(155, 234, 22, 0.15)",
                        transition: "all 0.35s ease",
                        zIndex: 2,
                      }}
                    >
                      {/* Glassy light-reflection highlight — makes the sphere
                          read as glass/liquid rather than a flat disc. */}
                      <div
                        style={{
                          position: "absolute",
                          top: "10%",
                          left: "16%",
                          width: "38%",
                          height: "24%",
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.3)",
                          filter: "blur(7px)",
                          pointerEvents: "none",
                        }}
                      />
                      <motion.div
                        animate={
                          !isCallActive
                            ? {
                                scale: [1, 1.06, 1],
                                boxShadow: [
                                  "0 0 16px rgba(155, 234, 22, 0.4)",
                                  "0 0 30px rgba(155, 234, 22, 0.7)",
                                  "0 0 16px rgba(155, 234, 22, 0.4)",
                                ],
                              }
                            : {}
                        }
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{
                          width: "62px",
                          height: "62px",
                          borderRadius: "50%",
                          background: isAiSpeaking ? AI_GRADIENT : isUserSpeaking ? "#38BDF8" : "#9BEA16",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isAiSpeaking ? "#FFFFFF" : "#000000",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <Phone size={26} strokeWidth={2.4} />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </div>

                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: isAiSpeaking ? "#C4B5FD" : isUserSpeaking ? "#7DD3FC" : isCallActive ? "#4ADE80" : "#9BEA16",
                    marginTop: "16px",
                    textAlign: "center",
                    textShadow: "0 2px 12px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {isAiSpeaking ? "AI Speaking (Click to interrupt)" : isUserSpeaking ? "Listening to you..." : isCallActive ? "Connected • Speak naturally" : "Tap Orb or Button to Start Voice Call"}
                </span>

                {/* Surfaces mic/STT/chat-API errors that were previously tracked in
                    speechStatusText but never rendered anywhere — any failure in the
                    voice pipeline looked identical to a normal, working call. */}
                {isCallActive && (() => {
                  const isError = speechStatusText.startsWith("Error:");
                  const isNeutral = speechStatusText.includes("Transcribing") || speechStatusText.includes("Didn't catch") || speechStatusText.includes("will end automatically");
                  if (!isError && !isNeutral) return null;
                  return (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        color: isError ? "#F87171" : "#A1A1AA",
                        marginTop: "3px",
                        textAlign: "center",
                      }}
                    >
                      {speechStatusText}
                    </span>
                  );
                })()}
              </div>

              {/* Real-time Subtitle & Transcription Bubble (ONLY SHOWN WHEN CONVERSATION/SPEECH EXISTS - RED MARKED INACTIVE BOX REMOVED) */}
              {(liveUserTranscript || conversationHistory.length > 0) && (
                <div
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    minHeight: "50px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  {liveUserTranscript ? (
                    <div>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                        🔴 You are speaking
                      </span>
                      <p style={{ margin: 0, fontSize: "13px", color: "#38BDF8", fontWeight: 600, lineHeight: 1.35 }}>
                        &ldquo;{liveUserTranscript}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: conversationHistory[conversationHistory.length - 1].speaker === "ai" ? "#9BEA16" : "#38BDF8",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        {conversationHistory[conversationHistory.length - 1].speaker === "ai" ? `${activeIndustry.brandName} Receptionist` : "You (Caller)"}
                      </span>
                      <p style={{ margin: 0, fontSize: "12.5px", color: "#F5F5F0", lineHeight: 1.4 }}>
                        &ldquo;{conversationHistory[conversationHistory.length - 1].text}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 1-Click Test Prompts Carousel (100% within card boundaries, no overflow clipping) */}
              <div style={{ width: "100%", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 500 }}>
                    💡 1-Click Prompts (Instant Audio):
                  </span>
                  <span style={{ fontSize: "10px", color: "#71717A" }}>Swipe ➔</span>
                </div>
                <div
                  className="touch-scroll"
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    padding: "2px 2px 6px 2px",
                    scrollSnapType: "x mandatory",
                    width: "100%",
                  }}
                >
                  {samplePrompts.slice(0, 5).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!isCallActive) {
                          handleStartCall();
                        }
                        processConversationTurn(p.text);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#D4D4D8",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        scrollSnapAlign: "start",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(155, 234, 22, 0.5)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Action Controls with Magnetic Glowing CTA */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center", paddingTop: "4px" }}>
                {!isCallActive ? (
                  <motion.button
                    onClick={handleStartCall}
                    disabled={isConnecting}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 35px rgba(155, 234, 22, 0.8)" }}
                    whileTap={{ scale: 0.97 }}
                    animate={{
                      boxShadow: [
                        "0 0 16px rgba(155, 234, 22, 0.45)",
                        "0 0 30px rgba(155, 234, 22, 0.75)",
                        "0 0 16px rgba(155, 234, 22, 0.45)",
                      ],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "13px 32px",
                      borderRadius: "999px",
                      background: "#9BEA16",
                      color: "#000000",
                      fontSize: "14px",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    <motion.span
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Phone size={16} strokeWidth={2.4} />
                    </motion.span>
                    <span>Start Voice Call</span>
                  </motion.button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        stopCurrentAudio();
                        startLiveListening();
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "10px 16px",
                        borderRadius: "999px",
                        background: isUserSpeaking ? "#38BDF8" : "rgba(155, 234, 22, 0.15)",
                        color: isUserSpeaking ? "#000000" : "#9BEA16",
                        border: `1px solid ${isUserSpeaking ? "#38BDF8" : "rgba(155, 234, 22, 0.4)"}`,
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Radio size={13} />
                      <span>{isAiSpeaking ? "Interrupt" : isUserSpeaking ? "Listening..." : "🎙️ Speak"}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!isMuted) {
                          stopLiveListening();
                          setIsMuted(true);
                        } else {
                          setIsMuted(false);
                          startLiveListening();
                        }
                      }}
                      title={isMuted ? "Unmute" : "Mute"}
                      style={{
                        padding: "10px",
                        borderRadius: "50%",
                        background: isMuted ? "#F87171" : "rgba(255, 255, 255, 0.08)",
                        color: isMuted ? "#000000" : "#F5F5F0",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    <button
                      onClick={() => {
                        setIsSpeakerOn(!isSpeakerOn);
                        if (isSpeakerOn) stopCurrentAudio();
                      }}
                      title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
                      style={{
                        padding: "10px",
                        borderRadius: "50%",
                        background: !isSpeakerOn ? "#FBBF24" : "rgba(255, 255, 255, 0.08)",
                        color: !isSpeakerOn ? "#000000" : "#F5F5F0",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isSpeakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>

                    <button
                      onClick={handleEndCall}
                      title="End Call"
                      style={{
                        padding: "10px 18px",
                        borderRadius: "999px",
                        background: "#EF4444",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <PhoneOff size={14} />
                      <span>End Call</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* CHATBOT CHANNEL INTERFACE */
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {dataBadgesLayer}

              {/* Message Thread */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: "8px",
                  maxHeight: "400px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                {conversationHistory.map((msg, index) => {
                  const isAi = msg.speaker === "ai";
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "8px",
                        justifyContent: isAi ? "flex-start" : "flex-end",
                        width: "100%",
                      }}
                    >
                      {isAi && (
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: AI_GRADIENT,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginBottom: "2px",
                          }}
                        >
                          <Sparkles size={12} color="#fff" />
                        </span>
                      )}
                      <div
                        style={{
                          maxWidth: "78%",
                          padding: "12px 16px",
                          borderRadius: isAi ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                          background: isAi ? "rgba(255, 255, 255, 0.06)" : "#9BEA16",
                          color: isAi ? "#F5F5F0" : "#000000",
                          border: isAi ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                          fontSize: "13.5px",
                          lineHeight: 1.45,
                        }}
                      >
                        <p style={{ margin: 0 }}>{msg.text}</p>
                        <span
                          style={{
                            fontSize: "10px",
                            color: isAi ? "#8E8E93" : "rgba(0,0,0,0.6)",
                            marginTop: "4px",
                            display: "block",
                            textAlign: isAi ? "left" : "right",
                          }}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                      {!isAi && (
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginBottom: "2px",
                          }}
                        >
                          <User size={12} color="#D4D0C7" />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick suggestions */}
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px" }}>
                {samplePrompts.slice(0, 4).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => processConversationTurn(p.text)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#A1A1AA",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    processConversationTurn(chatInput);
                    setChatInput("");
                  }
                }}
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${activeIndustry.brandName}...`}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#F5F5F0",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !chatInput.trim()}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    background: "#9BEA16",
                    color: "#000000",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

        {/* Webhook JSON — a minimal, unobtrusive developer toggle, not a panel */}
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setShowJsonPayload(!showJsonPayload)}
              style={{
                background: "transparent",
                border: "none",
                color: "#71717A",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: 0,
              }}
            >
              <Code2 size={12} />
              <span>{showJsonPayload ? "Hide Webhook JSON" : "View Webhook JSON"}</span>
              {showJsonPayload ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showJsonPayload && (
              <button
                onClick={copyPayloadToClipboard}
                title="Copy Payload"
                style={{
                  background: "transparent",
                  border: "none",
                  color: copiedPayload ? "#9BEA16" : "#71717A",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Copy size={12} />
                <span>{copiedPayload ? "Copied!" : "Copy"}</span>
              </button>
            )}
          </div>

          {showJsonPayload && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
              style={{
                background: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(139, 92, 246, 0.18)",
                padding: "12px 14px",
                borderRadius: "12px",
                fontSize: "10.5px",
                color: "#67E8F9",
                maxHeight: "130px",
                overflowY: "auto",
                margin: 0,
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(
                isAutomobile
                  ? {
                      event: extractedData.intent === "TEST_DRIVE" ? "automobile.test_drive.booked" : "automobile.service.booked",
                      reference_id: extractedData.reference_id || extractedData.appointment_id || "—",
                      customer_name: extractedData.name || "—",
                      mobile_number: extractedData.mobile || "—",
                      vehicle_model: extractedData.vehicleModel || "—",
                      registration_number: extractedData.registrationNumber || "—",
                      service_or_action: extractedData.serviceType || extractedData.intent || "—",
                      dealer_location: extractedData.dealerLocation || "—",
                      slot: extractedData.slot || "—",
                      confirmed: !!extractedData.confirmed,
                      status: extractedData.appointment_status || "PENDING_INTAKE",
                    }
                  : {
                      event: "clinic.appointment.booked",
                      appointment_id: extractedData.appointment_id || "—",
                      patient_name: extractedData.name || "—",
                      mobile_number: extractedData.mobile || "—",
                      age: extractedData.dob || "—",
                      intent: extractedData.intent || "—",
                      department: extractedData.department || "—",
                      doctor: extractedData.doctor || "—",
                      slot: extractedData.slot || "—",
                      // Reflects the backend's own verified state — not just
                      // whether some text has landed in a field yet.
                      confirmed: !!extractedData.confirmed,
                      appointment_status: extractedData.appointment_status || "PENDING_INTAKE",
                    },
                null,
                2
              )}
            </motion.pre>
          )}
        </div>
      </div>
      </>
      )}

      <style>{`
        .crm-picker-trigger:hover {
          border-color: rgba(255, 255, 255, 0.25) !important;
          filter: brightness(1.15);
        }
        /* Floating annotation badges around the orb — absolutely positioned
           on desktop (see inline top/left/right/bottom per badge); reflow
           into a plain centered wrapped row on narrow screens where there
           isn't room around a centered orb without overlapping it. */
        .floating-badges-layer.chat-mode {
          position: static !important;
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          gap: 8px !important;
          margin-bottom: 14px !important;
          pointer-events: auto !important;
        }
        .floating-badges-layer.chat-mode .floating-badge {
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          transform: none !important;
          max-width: 130px !important;
        }
        @media (max-width: 640px) {
          .floating-badges-layer {
            position: static !important;
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 8px !important;
            margin-top: 18px !important;
            pointer-events: auto !important;
          }
          .floating-badge {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            transform: none !important;
            max-width: 130px !important;
          }
          .header-top-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .header-action-controls {
            justify-content: space-between !important;
            width: 100% !important;
          }
        }
        @media (max-width: 420px) {
          .stepper-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
