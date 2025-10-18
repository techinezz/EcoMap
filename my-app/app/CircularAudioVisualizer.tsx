'use client';

import { useEffect, useRef } from 'react';

interface CircularAudioVisualizerProps {
  audioData: Uint8Array;
  size?: number;
  barCount?: number;
  barColor?: string;
}

export default function CircularAudioVisualizer({
  audioData,
  size = 300,
  barCount = 64,
  barColor = '#ffffff',
}: CircularAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 4;
    const bufferLength = audioData.length;

    // Draw circular bars
    for (let i = 0; i < barCount; i++) {
      const angle = (Math.PI * 2 * i) / barCount;
      const dataIndex = Math.floor((i * bufferLength) / barCount);
      const barHeight = (audioData[dataIndex] / 255) * (size / 4);

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.strokeStyle = barColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, [audioData, size, barCount, barColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
    />
  );
}
