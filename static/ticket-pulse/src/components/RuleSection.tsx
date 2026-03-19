import React, { useState } from "react";
import type { RuleOutcome } from "../types/rules";
import { SuggestionItem } from "./SuggestionItem";
import { getScoreTier } from "../utils/score";

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

  const scoreTier = getScoreTier(passPercentage);

  const cardClass = `rule-card ${isAI ? "rule-card--ai" : "rule-card--default"}`;

  const headerClass = [
    "rule-header",
    isAI ? "rule-header--ai" : expanded ? "rule-header--expanded" : "rule-header--default",
    hasFindings ? "rule-header--clickable" : "rule-header--static",
  ].join(" ");

  return (
    <div className={cardClass}>
      <button
        onClick={hasFindings ? () => setExpanded(!expanded) : undefined}
        className={headerClass}
      >
        {hasFindings && (
          <span className="rule-icon">
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        )}
        {!hasFindings && !isAI && (
          <span className="rule-check">{"\u2713"}</span>
        )}
        {isAI && <span className="rule-ai-icon">&#x2728;</span>}
        <span className="rule-name">{outcome.ruleName}</span>
        {!isAI && (
          <span className={`rule-score-badge rule-score-badge--${scoreTier}`}>
            {outcome.score}/{outcome.maxScore}
          </span>
        )}
        {isAI && (
          <span className="rule-ai-badge">AI</span>
        )}
      </button>
      {expanded && hasFindings && (
        <div className="rule-findings">
          {outcome.findings.map((finding, i) => (
            <SuggestionItem key={i} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
};
