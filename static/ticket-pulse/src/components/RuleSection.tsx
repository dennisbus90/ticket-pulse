import React, { useState } from "react";
import type { RuleOutcome } from "../types/rules";
import { SuggestionItem } from "./SuggestionItem";

interface RuleSectionProps {
  outcome: RuleOutcome;
}

export const RuleSection: React.FC<RuleSectionProps> = ({ outcome }) => {
  const isAI = outcome.ruleId === "ai-analysis";
  const hasFindings = outcome.findings.length > 0;
  const passPercentage =
    outcome.maxScore > 0 ? outcome.score / outcome.maxScore : 1;
  const [expanded, setExpanded] = useState(
    hasFindings && (isAI || passPercentage < 0.8),
  );

  const scoreColor =
    passPercentage >= 0.8
      ? "#36B37E"
      : passPercentage >= 0.5
        ? "#FFAB00"
        : "#DE350B";

  const headerContent = (
    <>
      {hasFindings && (
        <span style={{ flexShrink: 0, fontSize: 12, color: "#6B778C" }}>
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
      )}
      {!hasFindings && !isAI && (
        <span style={{ color: "#36B37E", flexShrink: 0 }}>{"\u2713"}</span>
      )}
      {isAI && <span style={{ flexShrink: 0, fontSize: 12 }}>&#x2728;</span>}
      <span style={{ flex: 1 }}>{outcome.ruleName}</span>
      {!isAI && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 10,
            background: `${scoreColor}20`,
            color: scoreColor,
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {outcome.score}/{outcome.maxScore}
        </span>
      )}
      {isAI && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 10,
            background: "#0052CC20",
            color: "#0052CC",
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          AI
        </span>
      )}
    </>
  );

  const headerStyle = {
    width: "100%",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "10px 12px",
    background: isAI ? "#EAF0FF" : expanded ? "#FAFBFC" : "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "#172B4D",
    textAlign: "left" as const,
  };

  return (
    <div
      style={{
        border: `1px solid ${isAI ? "#B3D4FF" : "#DFE1E6"}`,
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden",
        background: isAI ? "#F4F7FF" : undefined,
      }}
    >
      <button
        onClick={hasFindings ? () => setExpanded(!expanded) : undefined}
        style={{
          ...headerStyle,
          cursor: hasFindings ? "pointer" : "default",
        }}
      >
        {headerContent}
      </button>
      {expanded && hasFindings && (
        <div
          style={{ padding: "4px 12px 12px", borderTop: "1px solid #F4F5F7" }}
        >
          {outcome.findings.map((finding, i) => (
            <SuggestionItem key={i} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
};
