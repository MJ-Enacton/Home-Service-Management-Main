"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
  y?: number; // translateY distance
  duration?: number;
  as?: "div" | "section";
};

export function Reveal({ children, className, delay = 0, y = 12, duration = 600, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "will-change-transform",
        !visible && "opacity-0",
        visible && "animate-[reveal_600ms_var(--ease-spring)_both]",
        className,
      )}
      style={
        !visible
          ? { transform: `translateY(${y}px)` }
          : delay
            ? { animationDelay: `${delay}ms`, animationDuration: `${duration}ms` }
            : { animationDuration: `${duration}ms` }
      }
    >
      {children}
    </Tag>
  );
}
