'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Compass, Eye, ShieldAlert, ArrowLeft, RefreshCw, Layers, CheckCircle } from 'lucide-react';

interface Report {
  id: number;
  category: string;
  title: string;
  description: string;
  evidence_url: string | null;
  status: string;
  upvotes: number;
  lat: number;
  lng: number;
  created_at: string;
}

const GRID_BOUNDS = {
  minLat: 12.80,
  maxLat: 13.25,
  minLng: 80.10,
  maxLng: 80.35,
};

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const sweepAngleRef = useRef(0);

  // Fetch Reports from API
  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/reports`);
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports || []);
        // Auto-select first report if available
        if (data.reports && data.reports.length > 0) {
          setSelectedReport(data.reports[0]);
        }
      } else {
        setErrorMsg('Failed to load incident records.');
      }
    } catch (err) {
      setErrorMsg('Gateway unreachable. Run backend stack.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Spatial projection helpers: maps Lat/Lng to Canvas Width/Height
  const project = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng - GRID_BOUNDS.minLng) / (GRID_BOUNDS.maxLng - GRID_BOUNDS.minLng)) * width;
    const y = (1 - ((lat - GRID_BOUNDS.minLat) / (GRID_BOUNDS.maxLat - GRID_BOUNDS.minLat))) * height;
    return { x, y };
  };

  // Canvas Radar Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Set canvas to parent container square bounds
      const parent = canvas.parentElement;
      if (parent) {
        const size = Math.min(parent.clientWidth, 600);
        canvas.width = size;
        canvas.height = size;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear Screen
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw Radar Grid
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.08)';
      ctx.lineWidth = 1;

      // Horizontal and vertical grid lines
      const divisions = 6;
      for (let i = 1; i < divisions; i++) {
        const x = (w / divisions) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        const y = (h / divisions) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw concentric radar circles
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
      const maxRadius = Math.sqrt(w*w + h*h) / 2;
      const center = { x: w / 2, y: h / 2 };
      
      for (let r = maxRadius / 5; r <= maxRadius; r += maxRadius / 5) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Chennai Bounds Label markings
      ctx.fillStyle = '#444444';
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(`NW: ${GRID_BOUNDS.maxLat.toFixed(2)}N, ${GRID_BOUNDS.minLng.toFixed(2)}E`, 10, 15);
      ctx.fillText(`SE: ${GRID_BOUNDS.minLat.toFixed(2)}N, ${GRID_BOUNDS.maxLng.toFixed(2)}E`, w - 130, h - 10);

      // 3. Draw Radar Sweep Animation
      sweepAngleRef.current = (sweepAngleRef.current + 0.01) % (Math.PI * 2);
      const angle = sweepAngleRef.current;

      const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, maxRadius);
      gradient.addColorStop(0, 'rgba(0, 255, 102, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 255, 102, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, maxRadius, angle - 0.25, angle);
      ctx.lineTo(center.x, center.y);
      ctx.fill();

      // Sweep green leading edge line
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(
        center.x + Math.cos(angle) * maxRadius,
        center.y + Math.sin(angle) * maxRadius
      );
      ctx.stroke();

      // 4. Draw Geolocation Data Points (Reports)
      reports.forEach((report) => {
        const { x, y } = project(report.lat, report.lng, w, h);
        const isSelected = selectedReport?.id === report.id;

        // Choose color based on status/category
        let color = '255, 51, 51'; // Unverified = Hazard Red
        if (report.status === 'verified') {
          color = '0, 255, 102'; // Verified = Safe/Secure Green
        } else if (report.category === 'environmental') {
          color = '0, 229, 255'; // Environmental = Cyan
        }

        // Draw pulsing expanding rings
        const pulseRatio = (Date.now() % 1500) / 1500; // 0 to 1 loop
        ctx.strokeStyle = `rgba(${color}, ${0.4 * (1 - pulseRatio)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4 + pulseRatio * 16, 0, Math.PI * 2);
        ctx.stroke();

        // Draw core marker dot
        ctx.fillStyle = `rgba(${color}, 1)`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // If selected, draw a crosshair target around it
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          
          // Outer box
          ctx.strokeRect(x - 8, y - 8, 16, 16);

          // Pointer lines
          ctx.beginPath();
          ctx.moveTo(x - 12, y); ctx.lineTo(x - 5, y);
          ctx.moveTo(x + 5, y); ctx.lineTo(x + 12, y);
          ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 5);
          ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 12);
          ctx.stroke();

          // Text label
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`NODE #${report.id}`, x + 12, y - 12);
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [reports, selectedReport]);

  // Click handler to select report node on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Calculate click coordinates relative to canvas dimensions
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Find the closest marker within a threshold radius (15px)
    let closestReport: Report | null = null;
    let minDistance = 15;

    reports.forEach((report) => {
      const { x, y } = project(report.lat, report.lng, canvas.width, canvas.height);
      const distance = Math.hypot(clickX - x, clickY - y);
      if (distance < minDistance) {
        minDistance = distance;
        closestReport = report;
      }
    });

    if (closestReport) {
      setSelectedReport(closestReport);
      console.log(`[RADAR COMPASS] Locked target node #${(closestReport as Report).id}`);
    }
  };

  const getMimeBadgeClass = (category: string) => {
    switch (category) {
      case 'infrastructure': return 'cyan';
      case 'injustice': return 'red';
      default: return 'green';
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '850px' }}>
      {/* Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> <span style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}>RETURN_TO_GATEWAY</span>
        </a>
        <button
          onClick={fetchReports}
          className="tactical-btn"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> SYNC LEDGER
        </button>
      </header>

      {/* Grid Alert Status */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Compass size={24} /> THE MAP
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Chennai Spatial Audit. Tap active radar signals to inspect verified/unverified operational nodes.
        </p>
      </div>

      {/* Operational Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Radar Map Column */}
        <div>
          <div className="terminal-card" style={{ padding: '0.5rem', background: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ display: 'block', cursor: 'crosshair', maxWidth: '100%' }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', display: 'block', marginTop: '0.5rem', textAlign: 'center' }}>
            RADAR SCAN RANGE: CHENNAI viewport [12.80N-13.25N, 80.10E-80.35E] • TAP MARKER TO LOCK HUD
          </span>
        </div>

        {/* HUD side panel Column */}
        <div className="terminal-card" style={{ borderColor: 'var(--border-bright)', background: 'var(--bg-deep)' }}>
          {selectedReport ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>
                  Target Node: <strong style={{ color: '#ffffff' }}>#{selectedReport.id}</strong>
                </span>
                <span className={`neon-badge ${getMimeBadgeClass(selectedReport.category)}`}>
                  {selectedReport.category}
                </span>
              </div>

              <h3 style={{ fontSize: '1.3rem', color: 'var(--fg-primary)', marginBottom: '0.5rem' }}>
                {selectedReport.title}
              </h3>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--fg-secondary)', marginBottom: '1rem' }}>
                <span>GPS: <strong>{selectedReport.lat.toFixed(5)}N, {selectedReport.lng.toFixed(5)}E</strong></span>
                <span>STATUS: 
                  <strong style={{ color: selectedReport.status === 'verified' ? 'var(--neon-green)' : 'var(--neon-red)', marginLeft: '0.3rem' }}>
                    {selectedReport.status.toUpperCase()}
                  </strong>
                </span>
              </div>

              <p style={{ color: 'var(--fg-primary)', fontSize: '0.9rem', lineHeight: '1.5', background: 'var(--bg-elevated)', padding: '1rem', border: '1px solid var(--border-dim)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                {selectedReport.description}
              </p>

              {/* Evidence photo preview */}
              {selectedReport.evidence_url ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="tactical-label" style={{ marginBottom: '0.5rem' }}>LEAKED EVIDENCE ATTACHMENT</span>
                  <div style={{ border: '1px solid var(--border-dim)', background: 'var(--bg-pitch)', padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                    {/* Convert relative path to full URL */}
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000'}${selectedReport.evidence_url}`}
                      alt="Evidence Upload"
                      style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', border: '1px solid var(--border-bright)' }}
                      onError={(e) => {
                        // Fallback image source or warning state
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      }}
                    />
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>
                      <span>EXIF STATUS: <strong>STRIPPED [SECURE]</strong></span>
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000'}${selectedReport.evidence_url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: 'var(--neon-green)', textDecoration: 'none' }}
                      >
                        EXPAND BINARY
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="terminal-card" style={{ textAlign: 'center', padding: '1rem', borderStyle: 'dashed', color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  NO BINARY PHOTO LOGGED WITH THIS REPORT ENTRY
                </div>
              )}

              {/* Status info/actions */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid var(--border-dim)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>
                  LOGGED: {new Date(selectedReport.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--fg-dark)' }}>
              <ShieldAlert size={36} style={{ marginBottom: '1rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                GRID INSPECTOR OFFLINE
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                SELECT AN ACTIVE TARGET NODE ON THE GRID RADAR TO INITIALIZE HUD
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
