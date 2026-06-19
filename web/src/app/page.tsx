'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Eye, Map, Radio, Terminal, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [systemUptime, setSystemUptime] = useState(0);

  useEffect(() => {
    // Simulate tactical system booting logs
    const bootSequence = [
      'Establishing peer-to-peer relay network...',
      'Initializing cryptographic layers...',
      'Mapping node coordinates: Chennai East (13.0827° N, 80.2707° E)',
      'Scrubbing network access logs...',
      'Verifying operator keys...',
      'RUSSAW client operational. Press access codes to proceed.'
    ];

    bootSequence.forEach((log, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
      }, (index + 1) * 800);
    });

    // Uptime counter
    const interval = setInterval(() => {
      setSystemUptime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Tactical Header */}
      <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border-bright)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>
            RUSSAW //
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="pulse-dot"></span>
            <span className="neon-badge green" style={{ fontSize: '0.7rem' }}>CHENNAI_NODE_ACTIVE</span>
          </div>
        </div>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          THE VIGILANTE TACTICAL COLLECTIVE • RADICAL TRANSPARENCY • ZERO TRACE
        </p>
      </header>

      {/* Main Systems Panel */}
      <main>
        {/* System Alert banner */}
        <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.02)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Shield size={20} style={{ color: 'var(--neon-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Operational Notice: Anonymous Routing
              </p>
              <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Reports submitted via "The Void" are mathematically stripped of IP and device headers before writing to the ledger. Total security is manual: use TOR if reporting state agencies.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Hub Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', margin: '2rem 0' }}>
          
          {/* THE VOID */}
          <div className="terminal-card terminal-border">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} style={{ color: 'var(--neon-red)' }} /> THE VOID
              </h2>
              <span className="neon-badge red">Encrypted Reporting</span>
            </div>
            <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Upload photographic evidence of infrastructural decay, corporate negligence, or civic failure. Encrypted, untraceable.
            </p>
            <a href="/void" className="tactical-btn danger" style={{ fontSize: '0.75rem' }}>
              File Anonymous Report
            </a>
          </div>

          {/* THE MAP */}
          <div className="terminal-card terminal-border">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Map size={18} style={{ color: 'var(--neon-green)' }} /> THE MAP
              </h2>
              <span className="neon-badge green">Spatial Ledger</span>
            </div>
            <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Geospatial visualization of active audit zones in Chennai. Filter by community hazard level and proximity.
            </p>
            <a href="/map" className="tactical-btn primary" style={{ fontSize: '0.75rem' }}>
              Initialize Map Grid
            </a>
          </div>

          {/* MISSION BOARD */}
          <div className="terminal-card terminal-border">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio size={18} style={{ color: 'var(--neon-cyan)' }} /> MISSION BOARD
              </h2>
              <span className="neon-badge cyan">Gamified Audits</span>
            </div>
            <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Weekly operations issued to operators. Complete field verification missions to claim community keys.
            </p>
            <a href="/missions" className="tactical-btn" style={{ fontSize: '0.75rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}>
              Access Active Missions
            </a>
          </div>

          {/* OPERATOR NETWORK */}
          <div className="terminal-card terminal-border">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} style={{ color: 'var(--neon-orange)' }} /> THE OPERATOR NETWORK
              </h2>
              <span className="neon-badge" style={{ borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}>Secure Forum</span>
            </div>
            <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Restricted tiered network. Access is only unlocked with a validated field report key. No exceptions.
            </p>
            <a href="/network" className="tactical-btn" style={{ fontSize: '0.75rem', borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}>
              Authenticate Key
            </a>
          </div>

        </section>

        {/* Live Terminal Output console */}
        <section className="terminal-card" style={{ background: '#030303', borderColor: 'var(--border-dim)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Terminal size={12} /> System Terminal Logs
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>
              SYSTEM_UPTIME: {systemUptime}s
            </span>
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {logs.length === 0 ? (
              <span style={{ color: 'var(--fg-dark)', fontSize: '0.75rem' }}>Booting console telemetry...</span>
            ) : (
              logs.map((log, index) => (
                <span key={index} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-green)' }}>
                  {log}
                </span>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', textAlign: 'center', padding: '1rem 0', borderTop: '1px solid var(--border-dim)' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--fg-dark)' }}>
          RUSSAW DECENTRALIZED PROTOCOL • BUILD VERSION MVP.2026.06.18 • SECURE TRANSMISSION ONLY
        </p>
      </footer>
    </div>
  );
}
