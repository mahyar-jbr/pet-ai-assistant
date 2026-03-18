/**
 * ScoreRing — Shared SVG circular score gauge (64px). Animated arc fill,
 * color-coded: blue 70+, amber 50-69, red <50. Used in ProductDetail and ComparisonTool.
 * @param {number} score
 * @param {string} compareId — triggers re-animation on change
 */
import { useEffect, useState } from 'react';

const ScoreRing = ({ score = 0, compareId = '' }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    setOffset(circumference);
    let innerTimer;
    const outerTimer = requestAnimationFrame(() => {
      innerTimer = requestAnimationFrame(() => {
        const pct = Math.min(score / 100, 1);
        setOffset(circumference * (1 - pct));
      });
    });
    return () => {
      cancelAnimationFrame(outerTimer);
      cancelAnimationFrame(innerTimer);
    };
  }, [compareId, score, circumference]);

  const colorClass = score >= 70 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low';

  return (
    <div className="score-ring">
      <svg className="score-ring-svg" viewBox="0 0 64 64">
        <circle className="score-ring-bg" cx="32" cy="32" r={radius} />
        <circle
          className={`score-ring-fill ${colorClass}`}
          cx="32"
          cy="32"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text className="score-ring-number" x="32" y="30" textAnchor="middle" dominantBaseline="middle">
          {score}
        </text>
        <text className="score-ring-label" x="32" y="42" textAnchor="middle" dominantBaseline="middle">
          /100
        </text>
      </svg>
    </div>
  );
};

export default ScoreRing;
