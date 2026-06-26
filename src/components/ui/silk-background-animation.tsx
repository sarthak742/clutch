'use client';

import { useEffect, useRef } from 'react';

// ── SilkCanvas ─────────────────────────────────────────────────────────────
// Animated canvas background layer (no text content).
export const SilkCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const speed = 0.02;
    const scale = 2;
    const noiseIntensity = 0.8;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const noise = (x: number, y: number) => {
      const G = 2.71828;
      const rx = G * Math.sin(G * x);
      const ry = G * Math.sin(G * y);
      return (rx * ry * (1 + x)) % 1;
    };

    // Draw a single frame for the current `time`. Extracted so we can render
    // one static frame in reduced-motion mode without running the rAF loop.
    const drawFrame = () => {
      const { width, height } = canvas;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(0.5, '#2a2a2a');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let x = 0; x < width; x += 2) {
        for (let y = 0; y < height; y += 2) {
          const u = (x / width) * scale;
          const v = (y / height) * scale;
          const tOffset = speed * time;
          const tex_x = u;
          const tex_y = v + 0.03 * Math.sin(8.0 * tex_x - tOffset);
          const pattern = 0.6 + 0.4 * Math.sin(
            5.0 * (tex_x + tex_y + Math.cos(3.0 * tex_x + 5.0 * tex_y) + 0.02 * tOffset) +
            Math.sin(20.0 * (tex_x + tex_y - 0.1 * tOffset))
          );
          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - rnd / 15.0 * noiseIntensity);
          const r = Math.floor(123 * intensity);
          const g = Math.floor(116 * intensity);
          const b = Math.floor(129 * intensity);
          const index = (y * width + x) * 4;
          if (index < data.length) {
            data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const overlay = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      overlay.addColorStop(0, 'rgba(0,0,0,0.1)');
      overlay.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      drawFrame();
      time += 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    // Accessibility: respect prefers-reduced-motion. The raw canvas rAF loop is
    // invisible to Framer Motion's useReducedMotion, so guard it here.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = () => {
      if (mq.matches) {
        drawFrame(); // single static frame — no continuous motion
        return;
      }
      animate();
    };

    const handleChange = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      start();
    };

    start();
    mq.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      mq.removeEventListener('change', handleChange);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        animation: 'silk-fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      aria-hidden="true"
    />
  );
};
