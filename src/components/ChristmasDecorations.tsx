"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

const ChristmasDecorations: React.FC = () => {
  const { christmasEnabled } = useTheme();

  if (!christmasEnabled) return null;

  return (
    <>
      {/* Soft snowy border glow */}
      <div className="pointer-events-none fixed inset-0 z-40 christmas-border" />

      {/* Static festive garland at the top */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 z-40 flex justify-center">
        <svg
          width="100%"
          height="110"
          viewBox="0 0 1200 110"
          preserveAspectRatio="none"
          className="drop-shadow-sm"
        >
          {/* Rope */}
          <path
            d="M 0 50 Q 200 90 400 50 T 800 50 T 1200 50"
            fill="none"
            stroke="hsl(174 75% 38%)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Pine needles (stylized strokes below rope) */}
          <path
            d="M 0 60 Q 200 100 400 60 T 800 60 T 1200 60"
            fill="none"
            stroke="hsl(174 60% 30%)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Static lights */}
          {Array.from({ length: 20 }, (_, i) => {
            const x = i * 60 + 40;
            const y = 65 + Math.sin(i / 2) * 18;
            const colors = ["hsl(0 84% 60%)", "hsl(50 100% 50%)", "hsl(187 85% 43%)", "hsl(174 75% 38%)"];
            const color = colors[i % colors.length];
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="10" fill={color} />
                <rect x={x - 2} y={y - 16} width="4" height="8" rx="1" fill="hsl(200 10% 30%)" />
              </g>
            );
          })}
          {/* Hanging ornaments */}
          {Array.from({ length: 8 }, (_, i) => {
            const x = i * 140 + 100;
            const yTop = 48;
            const y = 95;
            const hue = (i * 36) % 360;
            return (
              <g key={`orn-${i}`}>
                <line x1={x} y1={yTop} x2={x} y2={y - 12} stroke="hsl(200 10% 45%)" strokeWidth="2" />
                <circle cx={x} cy={y} r="12" fill={`hsl(${hue} 70% 55%)`} stroke="white" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom snow ridge */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40">
        <svg width="100%" height="80" viewBox="0 0 1200 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="snowShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
            </linearGradient>
          </defs>
          <path
            d="M0,40 C150,70 300,10 450,40 C600,70 750,20 900,40 C1050,60 1200,30 1200,30 L1200,80 L0,80 Z"
            fill="url(#snowShade)"
          />
        </svg>
      </div>
    </>
  );
};

export default ChristmasDecorations;