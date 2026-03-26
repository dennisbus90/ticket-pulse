import React, { useState, useEffect, useRef } from "react";
import type {
  AnalysisResult,
  Finding,
  AnalysisFieldMapping,
  EstimationResult,
  EstimationFieldConfig,
  TimelineResult,
} from "../types";
import Seagull, { type SeagullAccessory } from "./animations/Seagull";

interface PanelProps {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onOpenSettings: () => void;
  onUpdateField?: (
    fieldId: string,
    value: string,
    isAdf: boolean,
  ) => Promise<void>;
  analysisFields?: AnalysisFieldMapping[];
  hasApiKey: boolean;
  estimation: EstimationResult | null;
  estimationLoading: boolean;
  estimationError: string | null;
  estimationField: EstimationFieldConfig | null;
  timeline: TimelineResult | null;
  timelineLoading: boolean;
  timelineError: string | null;
  onRevealComplete?: () => void;
}

const LABEL_STYLES: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Poor: { bg: "#FFEBE6", color: "#BF2600", border: "#FFBDAD" },
  "Needs work": { bg: "#FFFAE6", color: "#FF8B00", border: "#FFE380" },
  Good: { bg: "#E3FCEF", color: "#006644", border: "#ABF5D1" },
  Excellent: { bg: "#E3FCEF", color: "#006644", border: "#ABF5D1" },
};

const LABEL_ACCESSORY: Record<string, SeagullAccessory> = {
  Poor: "horn",
  "Needs work": "glasses",
  Good: "boat-hat",
  Excellent: "crown",
};

const STATUS_COLORS: Record<string, string> = {
  "To Do": "#6B778C",
  Backlog: "#6B778C",
  Open: "#6B778C",
  "In Progress": "#0052CC",
  "In Development": "#0052CC",
  "In Review": "#5243AA",
  "Code Review": "#5243AA",
  Done: "#006644",
  Closed: "#006644",
  Resolved: "#006644",
  Blocked: "#BF2600",
  "On Hold": "#FF8B00",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#FF8B00";
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  ok: { icon: "✓", color: "#006644", bg: "#E3FCEF" },
  warn: { icon: "!", color: "#FF8B00", bg: "#FFFAE6" },
  err: { icon: "✕", color: "#BF2600", bg: "#FFEBE6" },
};

function ScoreBadge({
  score,
  label,
  showLabel = true,
  accessory,
}: {
  score: number;
  label: string;
  showLabel?: boolean;
  accessory?: SeagullAccessory;
}) {
  const style = LABEL_STYLES[label] || LABEL_STYLES.Good;
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
        }}
      >
        <div style={{ width: 50 }}>
          <Seagull accessory={accessory} />
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: style.color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {score}
        </div>
        <div
          style={{
            opacity: showLabel ? 1 : 0,
            transform: showLabel ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: style.color,
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 3,
              padding: "1px 6px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              lineHeight: "16px",
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 11, color: "#6B778C", marginTop: 2 }}>
            out of 100
          </div>
        </div>
      </div>
    </>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const config = STATUS_CONFIG[finding.status] || STATUS_CONFIG.warn;
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "8px 0",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          background: config.bg,
          color: config.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#172B4D",
            marginBottom: 1,
          }}
        >
          {finding.field}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#44546F",
            lineHeight: 1.45,
          }}
        >
          {finding.msg}
        </div>
      </div>
    </div>
  );
}

function SuggestionBox({
  text,
  fieldName,
  status,
  onUseThis,
}: {
  text: string;
  fieldName: string;
  status: "idle" | "saving" | "success" | "error";
  onUseThis: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 4,
        marginLeft: 26,
        background: "#F4F5F7",
        borderLeft: "3px solid #0052CC",
        borderRadius: "0 4px 4px 0",
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#6B778C",
          }}
        >
          Suggested {fieldName}
        </span>
        <button
          onClick={onUseThis}
          disabled={status === "saving"}
          style={{
            background:
              status === "success"
                ? "#36B37E"
                : status === "error"
                  ? "#BF2600"
                  : "#0052CC",
            color: "#fff",
            border: "none",
            borderRadius: 3,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 500,
            cursor: status === "saving" ? "default" : "pointer",
          }}
        >
          {status === "saving"
            ? "Saving..."
            : status === "success"
              ? "Done!"
              : status === "error"
                ? "Failed - Retry"
                : "Use this"}
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#172B4D",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          maxHeight: 80,
          overflow: "auto",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div style={{ padding: "16px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 32,
            borderRadius: 4,
            background:
              "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
        <div>
          <div
            style={{
              width: 72,
              height: 16,
              borderRadius: 3,
              background:
                "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
              animationDelay: "0.1s",
              marginBottom: 4,
            }}
          />
          <div
            style={{
              width: 48,
              height: 10,
              borderRadius: 2,
              background:
                "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
              animationDelay: "0.2s",
            }}
          />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background:
                "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
              animationDelay: `${0.1 * i}s`,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: "40%",
                height: 12,
                borderRadius: 2,
                marginBottom: 4,
                background:
                  "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: `${0.1 * i + 0.05}s`,
              }}
            />
            <div
              style={{
                width: "85%",
                height: 10,
                borderRadius: 2,
                background:
                  "linear-gradient(90deg, #F4F5F7 25%, #EBECF0 50%, #F4F5F7 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: `${0.1 * i + 0.1}s`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EstimationTab({
  estimation,
  loading,
  error,
  estimationField,
  onOpenSettings,
}: {
  estimation: EstimationResult | null;
  loading: boolean;
  error: string | null;
  estimationField: EstimationFieldConfig | null;
  onOpenSettings: () => void;
}) {
  const [showSimilar, setShowSimilar] = useState(false);

  if (!estimationField) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "16px 0",
          fontSize: 12,
          color: "#6B778C",
          lineHeight: 1.5,
        }}
      >
        No estimation field configured.
        <br />
        <button
          onClick={onOpenSettings}
          style={{
            background: "none",
            border: "none",
            color: "#0052CC",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            marginTop: 4,
          }}
        >
          Configure in settings
        </button>
      </div>
    );
  }

  if (loading) {
    return <AnalysisSkeleton />;
  }

  if (error) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "#BF2600",
          background: "#FFEBE6",
          borderRadius: 3,
          padding: "8px 10px",
          lineHeight: 1.45,
        }}
      >
        {error}
      </div>
    );
  }

  if (!estimation) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "12px 0",
          fontSize: 12,
          color: "#6B778C",
          lineHeight: 1.5,
        }}
      >
        Click analyze to compare estimation against similar tickets.
      </div>
    );
  }

  return (
    <div>
      {/* Suggested vs Team set */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#6B778C",
              marginBottom: 4,
            }}
          >
            Suggested
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0052CC",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {estimation.suggested ?? "N/A"}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#6B778C",
              marginBottom: 4,
            }}
          >
            Team set
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color:
                estimation.teamSet === null
                  ? "#97A0AF"
                  : estimation.suggested !== null &&
                      estimation.teamSet !== estimation.suggested
                    ? "#FF8B00"
                    : "#006644",
            }}
          >
            {estimation.teamSet ?? "Not set"}
          </div>
        </div>
      </div>

      {/* Match indicator */}
      {estimation.suggested !== null && estimation.teamSet !== null && (
        <div
          style={{
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 3,
            marginBottom: 10,
            background:
              estimation.teamSet === estimation.suggested
                ? "#E3FCEF"
                : "#FFFAE6",
            color:
              estimation.teamSet === estimation.suggested
                ? "#006644"
                : "#FF8B00",
            border: `1px solid ${estimation.teamSet === estimation.suggested ? "#ABF5D1" : "#FFE380"}`,
          }}
        >
          {estimation.teamSet === estimation.suggested
            ? "Team estimation matches historical data."
            : `Team estimated ${estimation.teamSet}, but similar tickets suggest ${estimation.suggested}.`}
        </div>
      )}

      {/* Reason */}
      <div
        style={{
          fontSize: 12,
          color: "#44546F",
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {estimation.reason}
      </div>

      {/* Similar tickets */}
      {estimation.similarTickets.length > 0 && (
        <div>
          <button
            onClick={() => setShowSimilar(!showSimilar)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "#6B778C",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 8,
                transform: showSimilar ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
                display: "inline-block",
              }}
            >
              {"\u25B6"}
            </span>
            Similar tickets ({estimation.similarTickets.length})
          </button>
          {showSimilar && (
            <div style={{ marginTop: 6 }}>
              {estimation.similarTickets.map((t) => (
                <div
                  key={t.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    borderBottom: "1px solid #F4F5F7",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#0052CC",
                      minWidth: 70,
                      flexShrink: 0,
                    }}
                  >
                    {t.key}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: "#44546F",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.summary}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#6B778C",
                      flexShrink: 0,
                      minWidth: 32,
                      textAlign: "right",
                    }}
                  >
                    {Math.round(t.similarity * 100)}%
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#172B4D",
                      flexShrink: 0,
                      minWidth: 24,
                      textAlign: "right",
                    }}
                  >
                    {t.estimationValue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineTab({
  timeline,
  loading,
  error,
  isNarrow,
}: {
  timeline: TimelineResult | null;
  loading: boolean;
  error: string | null;
  isNarrow?: boolean;
}) {
  if (loading) {
    return <AnalysisSkeleton />;
  }

  if (error) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "#BF2600",
          background: "#FFEBE6",
          borderRadius: 3,
          padding: "8px 10px",
          lineHeight: 1.45,
        }}
      >
        {error}
      </div>
    );
  }

  if (!timeline || timeline.transitions.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "12px 0",
          fontSize: 12,
          color: "#6B778C",
          lineHeight: 1.5,
        }}
      >
        No status transitions recorded for this ticket.
      </div>
    );
  }

  const totalDuration = timeline.transitions.reduce(
    (sum, t) => sum + t.duration,
    0,
  );

  const grouped = timeline.transitions.reduce<
    Array<{ status: string; duration: number }>
  >((acc, t) => {
    const existing = acc.find((g) => g.status === t.status);
    if (existing) {
      existing.duration += t.duration;
    } else {
      acc.push({ status: t.status, duration: t.duration });
    }
    return acc;
  }, []);

  return (
    <div>
      {/* Visual timeline bar */}
      <div
        style={{
          display: "flex",
          borderRadius: 4,
          overflow: "visible",
          height: 32,
          marginBottom: 16,
          border: "1px solid #EBECF0",
        }}
      >
        {grouped.map((g, i) => {
          const widthPct =
            totalDuration > 0
              ? Math.max((g.duration / totalDuration) * 100, 3)
              : 100 / grouped.length;
          const color = getStatusColor(g.status);
          return (
            <div
              key={i}
              className="timeline-bar-segment"
              data-tooltip={`${g.status}: ${formatDuration(g.duration)}`}
              style={{
                width: `${widthPct}%`,
                background: color,
                opacity: 0.85,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
                position: "relative",
                borderRight:
                  i < grouped.length - 1
                    ? "1px solid rgba(255,255,255,0.3)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#fff",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  padding: "0 4px",
                }}
              >
                {g.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Vertical timeline */}
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {[...timeline.transitions].reverse().map((t, i) => {
          const color = getStatusColor(t.status);
          const isActive = t.exitedAt === null;
          const isLast = i === timeline.transitions.length - 1;
          return (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              {/* Dot + line column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 14,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color,
                    border: isActive
                      ? `2px solid ${color}`
                      : "2px solid transparent",
                    boxSizing: "content-box",
                    flexShrink: 0,
                    marginTop: 3,
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      background: "#DFE1E6",
                      minHeight: 16,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  paddingBottom: isLast ? 0 : 14,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#172B4D",
                    }}
                  >
                    {t.status}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#006644",
                        background: "#E3FCEF",
                        border: "1px solid #ABF5D1",
                        borderRadius: 3,
                        padding: "1px 5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B778C",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span>
                    {formatDateShort(t.enteredAt)}
                    {" \u2192 "}
                    {t.exitedAt ? formatDateShort(t.exitedAt) : "now"}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#44546F",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatDuration(t.duration)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid #EBECF0",
          display: "flex",
          justifyContent: isNarrow ? "space-between" : "flex-start",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "#6B778C",
        }}
      >
        <span>Total time since creation</span>
        <span style={{ fontWeight: 600, color: "#172B4D" }}>
          {formatDuration(totalDuration)}
        </span>
      </div>
    </div>
  );
}

export const Panel: React.FC<PanelProps> = ({
  analysis,
  loading,
  error,
  onAnalyze,
  onOpenSettings,
  onUpdateField,
  analysisFields = [],
  hasApiKey,
  estimation,
  estimationLoading,
  estimationError,
  estimationField,
  timeline,
  timelineLoading,
  timelineError,
  onRevealComplete,
}) => {
  const [fieldUpdateStatus, setFieldUpdateStatus] = useState<
    Record<number, "idle" | "saving" | "success" | "error">
  >({});
  const [activeTab, setActiveTab] = useState<
    "quality" | "estimation" | "timeline"
  >("quality");
  const [displayedScore, setDisplayedScore] = useState(0);
  const [countUpDone, setCountUpDone] = useState(false);
  const [visibleFindings, setVisibleFindings] = useState(0);
  const lastAnimatedAnalysis = useRef<AnalysisResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < 400);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loading) {
      lastAnimatedAnalysis.current = null;
      setDisplayedScore(0);
      setCountUpDone(false);
      setVisibleFindings(0);
    }
  }, [loading]);

  useEffect(() => {
    if (!analysis || analysis === lastAnimatedAnalysis.current) return;
    lastAnimatedAnalysis.current = analysis;

    setDisplayedScore(0);
    setCountUpDone(false);
    setVisibleFindings(0);

    const startTime = performance.now();
    const duration = 3000;
    const target = analysis.score;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setCountUpDone(true);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      lastAnimatedAnalysis.current = null;
    };
  }, [analysis]);

  useEffect(() => {
    if (!countUpDone || !analysis) return;
    if (visibleFindings >= analysis.findings.length) return;

    const timer = setTimeout(() => {
      setVisibleFindings((v) => v + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [countUpDone, visibleFindings, analysis]);

  useEffect(() => {
    if (
      analysis &&
      countUpDone &&
      visibleFindings >= analysis.findings.length
    ) {
      onRevealComplete?.();
    }
  }, [countUpDone, visibleFindings, analysis, onRevealComplete]);

  const handleUseThis = async (index: number, finding: Finding) => {
    if (!onUpdateField || !finding.suggestion) return;
    const match = analysisFields.find(
      (f) => f.jiraFieldName.toLowerCase() === finding.field.toLowerCase(),
    );
    if (!match) return;
    const isAdf = match.jiraFieldId !== "summary";
    setFieldUpdateStatus((prev) => ({ ...prev, [index]: "saving" }));
    try {
      await onUpdateField(match.jiraFieldId, finding.suggestion, isAdf);
      setFieldUpdateStatus((prev) => ({ ...prev, [index]: "success" }));
      setTimeout(() => {
        setFieldUpdateStatus((prev) => ({ ...prev, [index]: "idle" }));
      }, 2000);
    } catch {
      setFieldUpdateStatus((prev) => ({ ...prev, [index]: "error" }));
    }
  };
  if (!hasApiKey) {
    return (
      <div
        style={{
          padding: "28px 16px",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>
          &#9881;
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#172B4D",
            marginBottom: 6,
          }}
        >
          Configure AI analysis
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#6B778C",
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          Add your OpenAI API key to enable
          <br />
          AI-powered ticket reviews.
        </div>
        <button
          onClick={onOpenSettings}
          style={{
            background: "#0052CC",
            color: "#fff",
            border: "none",
            borderRadius: 3,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Open settings
        </button>
      </div>
    );
  }

  if (loading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header bar with tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid #EBECF0",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          {(["quality", "estimation", "timeline"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #2c6381"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: activeTab === tab ? "#2c6381" : "#6B778C",
                padding: "10px 12px 8px",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab === "quality"
                ? "Quality"
                : tab === "estimation"
                  ? "Estimation"
                  : "Timeline"}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="settings-cog"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 22,
            color: "#6B778C",
            padding: "2px 4px",
            borderRadius: 3,
            lineHeight: 1,
          }}
        >
          &#9881;
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "0 12px 12px 12px" }}>
        {activeTab === "quality" && (
          <>
            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "#BF2600",
                  background: "#FFEBE6",
                  borderRadius: 3,
                  padding: "8px 10px",
                  marginBottom: 10,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </div>
            )}

            {analysis && (
              <>
                {/* Score */}
                <div style={{ marginBottom: 8 }}>
                  <ScoreBadge
                    score={displayedScore}
                    label={analysis.label}
                    showLabel={countUpDone}
                    accessory={LABEL_ACCESSORY[analysis.label]}
                  />
                </div>

                {/* Findings */}
                {countUpDone && (
                  <div
                    style={{
                      borderTop: "1px solid #EBECF0",
                      paddingTop: 4,
                    }}
                  >
                    {analysis.findings.slice(0, visibleFindings).map((f, i) => {
                      const status = fieldUpdateStatus[i] ?? "idle";
                      return (
                        <div
                          key={i}
                          style={{
                            animation:
                              visibleFindings < analysis.findings.length
                                ? "fadeIn 0.4s ease-out"
                                : undefined,
                          }}
                        >
                          <FindingRow finding={f} />
                          {f.suggestion && (
                            <SuggestionBox
                              text={f.suggestion}
                              fieldName={f.field}
                              status={status}
                              onUseThis={() => handleUseThis(i, f)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!analysis && !error && (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px 0",
                  fontSize: 12,
                  color: "#6B778C",
                  lineHeight: 1.5,
                }}
              >
                Click analyze to review this ticket with AI.
              </div>
            )}
          </>
        )}

        {activeTab === "estimation" && (
          <EstimationTab
            estimation={estimation}
            loading={estimationLoading}
            error={estimationError}
            estimationField={estimationField}
            onOpenSettings={onOpenSettings}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineTab
            timeline={timeline}
            loading={timelineLoading}
            error={timelineError}
            isNarrow={isNarrow}
          />
        )}

        {/* Action button */}
        {activeTab !== "timeline" &&
          !loading &&
          !estimationLoading &&
          (!analysis ||
            (countUpDone && visibleFindings >= analysis.findings.length)) && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  !isNarrow && (analysis || estimation)
                    ? "flex-start"
                    : "stretch",
                marginTop: 12,
              }}
            >
              <button
                onClick={onAnalyze}
                disabled={loading || estimationLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width:
                    isNarrow || !(analysis || estimation) ? "100%" : "auto",
                  padding:
                    !isNarrow && (analysis || estimation)
                      ? "7px 16px"
                      : "7px 12px",
                  background: "#2c6381",
                  color: "#fff",
                  border: "none",
                  borderRadius: 3,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {loading || estimationLoading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "1.5px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Analyzing...
                  </>
                ) : analysis || estimation ? (
                  "Re-analyze"
                ) : (
                  "Analyze ticket"
                )}
              </button>
            </div>
          )}
      </div>
    </div>
  );
};
