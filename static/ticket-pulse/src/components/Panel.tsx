import React, { useState } from "react";
import type { AnalysisResult, Finding, AnalysisFieldMapping } from "../types";

interface PanelProps {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onOpenSettings: () => void;
  onUpdateField?: (fieldId: string, value: string, isAdf: boolean) => Promise<void>;
  analysisFields?: AnalysisFieldMapping[];
  hasApiKey: boolean;
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

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  ok: { icon: "✓", color: "#006644", bg: "#E3FCEF" },
  warn: { icon: "!", color: "#FF8B00", bg: "#FFFAE6" },
  err: { icon: "✕", color: "#BF2600", bg: "#FFEBE6" },
};

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const style = LABEL_STYLES[label] || LABEL_STYLES.Good;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
      <div>
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

function AnalysisSkeleton() {
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

export const Panel: React.FC<PanelProps> = ({
  analysis,
  loading,
  error,
  onAnalyze,
  onOpenSettings,
  onUpdateField,
  analysisFields = [],
  hasApiKey,
}) => {
  const [fieldUpdateStatus, setFieldUpdateStatus] = useState<
    Record<number, "idle" | "saving" | "success" | "error">
  >({});

  const handleUseThis = async (
    index: number,
    finding: Finding,
  ) => {
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
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid #EBECF0",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6B778C",
          }}
        >
          AI Review
        </span>
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
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
      <div>
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
            <div style={{ marginBottom: 14 }}>
              <ScoreBadge score={analysis.score} label={analysis.label} />
            </div>

            {/* Findings */}
            <div
              style={{
                borderTop: "1px solid #EBECF0",
                paddingTop: 4,
              }}
            >
              {analysis.findings.map((f, i) => {
                const status = fieldUpdateStatus[i] ?? "idle";
                return (
                  <div key={i}>
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

        {/* Action button */}
        <button
          onClick={onAnalyze}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            marginTop: 12,
            padding: "7px 12px",
            background: analysis ? "#F4F5F7" : "#0052CC",
            color: analysis ? "#172B4D" : "#fff",
            border: analysis ? "1px solid #DFE1E6" : "none",
            borderRadius: 3,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? (
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
              Analyzing…
            </>
          ) : analysis ? (
            "Re-analyze"
          ) : (
            "Analyze ticket"
          )}
        </button>
      </div>
    </div>
  );
};
