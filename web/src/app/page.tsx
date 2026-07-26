'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Eye, Map, Radio, Terminal, AlertTriangle, AlertCircle, Signal, WifiOff } from 'lucide-react';

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [systemUptime, setSystemUptime] = useState(0);

  const [hasEmergency, setHasEmergency] = useState(false);
  const [emergencyReport, setEmergencyReport] = useState<any>(null);
  
  // S.O.S Triangulation State
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosStep, setSosStep] = useState(0); // 0: idle, 1: gps lock, 2: channel modulate, 3: satellite uplink, 4: broadcast confirmed
  const [sosError, setSosError] = useState('');
  const [sosTelemetry, setSosTelemetry] = useState<any>({ lat: 0, lng: 0, status: 'offline', isMocked: false });
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Poll for emergencies
  useEffect(() => {
    const checkEmergencies = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/reports`);
        if (response.ok) {
          const data = await response.json();
          // Find any active S.O.S report
          const activeSos = data.reports?.find((r: any) => r.category === 'emergency' || r.status === 'emergency');
          if (activeSos) {
            setHasEmergency(true);
            setEmergencyReport(activeSos);
          } else {
            // Check local localStorage offline S.O.S queue
            const localQueue = JSON.parse(localStorage.getItem('russaw_offline_sos_queue') || '[]');
            if (localQueue.length > 0) {
              setHasEmergency(true);
              setEmergencyReport(localQueue[0]);
            } else {
              setHasEmergency(false);
            }
          }
        }
      } catch (err) {
        // API offline, check local localStorage queue
        const localQueue = JSON.parse(localStorage.getItem('russaw_offline_sos_queue') || '[]');
        if (localQueue.length > 0) {
          setHasEmergency(true);
          setEmergencyReport(localQueue[0]);
        }
      }
    };
    checkEmergencies();
    const interval = setInterval(checkEmergencies, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const triggerSOS = () => {
    setSosModalOpen(true);
    setSosStep(1); // 1: GPS search
    setSosError('');
    setOfflineQueued(false);
    
    // 1. Geolocation Lock
    if (!navigator.geolocation) {
      setSosError('GPS Hardware module not found.');
      simulateSatelliteDispatch(13.0827, 80.2707, true); // Fallback mock GPS
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Verify if coordinates are inside Chennai boundaries
        if (lat < 12.80 || lat > 13.25 || lng < 80.10 || lng > 80.35) {
          // Local position outside Chennai bounds. Mock location inside Chennai.
          simulateSatelliteDispatch(13.0827, 80.2707, true);
        } else {
          simulateSatelliteDispatch(lat, lng, false);
        }
      },
      (err) => {
        console.warn('GPS hardware access denied. Triggering satellite triangulation...');
        simulateSatelliteDispatch(13.0827, 80.2707, true); // Fallback mock GPS
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const simulateSatelliteDispatch = (lat: number, lng: number, isMocked: boolean) => {
    setSosTelemetry({ lat, lng, status: navigator.onLine ? 'online' : 'offline', isMocked });
    
    // Step 2: Establish Secure Channel (simulate frequency modulation)
    setTimeout(() => {
      setSosStep(2);
      
      // Step 3: Satellite Coupling Uplink
      setTimeout(() => {
        setSosStep(3);
        
        // Final transmission dispatch
        setTimeout(async () => {
          if (navigator.onLine) {
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
              const response = await fetch(`${apiUrl}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: `CRITICAL S.O.S: Scout in Danger ${isMocked ? '(Satellite Telemetry)' : ''}`,
                  description: `CRITICAL EMERGENCY ALERT. Operator has triggered S.O.S beacon. Triangulated location locked inside grid bounds. Scout requires immediate backup dispatch.`,
                  category: 'emergency',
                  lat: lat.toString(),
                  lng: lng.toString()
                })
              });
              
              if (response.ok) {
                setSosStep(4);
                setHasEmergency(true);
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] S.O.S Beacon Broadcasted over mesh gateway.`]);
              } else {
                setSosError('Mesh packet rejected. Fallback to offline satellite queue.');
                queueOfflineSOS(lat, lng);
              }
            } catch (err) {
              setSosError('Mesh gateway unreachable. Fallback to offline satellite queue.');
              queueOfflineSOS(lat, lng);
            }
          } else {
            // Offline: queue in localStorage
            queueOfflineSOS(lat, lng);
          }
        }, 2500);
      }, 2000);
    }, 2000);
  };

  const queueOfflineSOS = (lat: number, lng: number) => {
    const packet = {
      id: Date.now(),
      title: 'CRITICAL S.O.S: Scout in Danger (OFFLINE BROADCAST)',
      description: 'OFFLINE TRANSMISSION. Operator beacon active over satellite/radio relay.',
      category: 'emergency',
      lat,
      lng,
      status: 'emergency',
      created_at: new Date().toISOString()
    };
    
    // Store in localStorage S.O.S queue
    const queue = JSON.parse(localStorage.getItem('russaw_offline_sos_queue') || '[]');
    queue.push(packet);
    localStorage.setItem('russaw_offline_sos_queue', JSON.stringify(queue));
    
    setOfflineQueued(true);
    setSosStep(4);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] S.O.S Packet queued in Offline Satellite Dispatch.`]);
  };

  const clearEmergency = () => {
    localStorage.removeItem('russaw_offline_sos_queue');
    setHasEmergency(false);
    setEmergencyReport(null);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] S.O.S Beacon terminated. Operational grid clear.`]);
  };

  return (
    <div className="app-container">
      {/* Tactical Header */}
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-bright)', paddingBottom: '1rem' }}>
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
        {/* EMERGENCY WARNING BANNER */}
        {hasEmergency && (
          <div className="terminal-card emergency-alert-flash" style={{ borderLeft: '4px solid var(--neon-red)', background: 'rgba(255, 51, 51, 0.05)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={22} style={{ color: 'var(--neon-red)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <p style={{ color: 'var(--neon-red)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyItems: 'center', gap: '0.5rem' }}>
                  CRITICAL S.O.S: EMERGENCY BROADCAST IN EFFECT
                </p>
                <p style={{ color: 'var(--fg-primary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  An operator has triggered S.O.S. Target: <strong>"{emergencyReport?.title}"</strong>. Nearby scouts are deployed. Deploy or coordinate backup immediately!
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <a href="/map" className="tactical-btn danger" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', display: 'inline-flex' }}>
                    LOCATE EMERGENCY ON MAP
                  </a>
                  <button onClick={clearEmergency} className="tactical-btn" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', borderColor: 'var(--fg-secondary)', color: 'var(--fg-secondary)' }}>
                    DISMISS BEACON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMERGENCY BUTTON CARD */}
        <div className="terminal-card" style={{ border: '1px solid var(--neon-red)', background: 'rgba(255, 51, 51, 0.02)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h3 style={{ color: 'var(--neon-red)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <Radio size={18} /> S.O.S EMERGENCY TRANSMITTER
              </h3>
              <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Under threat or in civic danger? Broadcast encrypted GPS coordinates via satellite mesh relay. Operates offline without cell towers.
              </p>
            </div>
            <button 
              onClick={triggerSOS} 
              className="tactical-btn danger crt-effect" 
              style={{ fontSize: '0.75rem', letterSpacing: '0.05em', fontWeight: 'bold', animation: 'alert-flash 2s infinite alternate' }}
            >
              BROADCAST EMERGENCY S.O.S
            </button>
          </div>
        </div>

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

      {/* S.O.S SATELLITE DISPATCH MODAL */}
      {sosModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '1.5rem',
          fontFamily: 'var(--font-mono)'
        }}>
          <div className="terminal-card" style={{
            maxWidth: '450px',
            width: '100%',
            borderColor: 'var(--neon-red)',
            background: 'var(--bg-pitch)',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 51, 51, 0.2)'
          }}>
            <h2 className="glow-text-green" style={{ color: 'var(--neon-red)', fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Radio size={20} style={{ color: 'var(--neon-red)', animation: 'alert-flash 1s infinite alternate' }} /> 
              Emergency Beacon S.O.S
            </h2>

            {/* Satellite Orbital Animation */}
            <div className="satellite-orbit-container">
              <div className="satellite-globe">CHENNAI</div>
              <div className="satellite-orbiter"></div>
              {sosStep >= 3 && <div className="satellite-beam" style={{ left: '59px', top: '20px' }}></div>}
            </div>

            {/* Steps feedback */}
            <div style={{ margin: '1.5rem 0', textAlign: 'left', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.4rem 0', color: sosStep >= 1 ? 'var(--neon-green)' : 'var(--fg-dark)' }}>
                <span className={sosStep === 1 ? 'pulse-dot' : ''} style={{ background: sosStep >= 1 ? 'var(--neon-green)' : 'var(--fg-dark)' }}></span>
                <span>[STAGE 1] Triangulating GPS hardware lock...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.4rem 0', color: sosStep >= 2 ? 'var(--neon-cyan)' : 'var(--fg-dark)' }}>
                <span className={sosStep === 2 ? 'pulse-dot' : ''} style={{ background: sosStep >= 2 ? 'var(--neon-cyan)' : 'var(--fg-dark)' }}></span>
                <span>[STAGE 2] Modulating encrypted secure frequency...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.4rem 0', color: sosStep >= 3 ? 'var(--neon-orange)' : 'var(--fg-dark)' }}>
                <span className={sosStep === 3 ? 'pulse-dot' : ''} style={{ background: sosStep >= 3 ? 'var(--neon-orange)' : 'var(--fg-dark)' }}></span>
                <span>[STAGE 3] Uplinking packet payload to Satellite...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.4rem 0', color: sosStep >= 4 ? 'var(--neon-green)' : 'var(--fg-dark)' }}>
                <span className={sosStep === 4 ? 'pulse-dot' : ''} style={{ background: sosStep >= 4 ? 'var(--neon-green)' : 'var(--fg-dark)' }}></span>
                <span>[STAGE 4] Broadcast receipt confirmed. Roster sync complete.</span>
              </div>
            </div>

            {/* Telemetry details */}
            {sosStep >= 1 && sosTelemetry.lat !== 0 && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', fontSize: '0.75rem', color: 'var(--fg-secondary)', textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                <div>BEACON COORDS: <strong>{sosTelemetry.lat.toFixed(5)}° N, {sosTelemetry.lng.toFixed(5)}° E</strong></div>
                <div>GRID SOURCE: <strong>{sosTelemetry.isMocked ? 'SATELLITE TRACE DEFAULT' : 'NATIVE CELLULAR LOCK'}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                  <span>TRANSMISSION: </span>
                  {sosTelemetry.status === 'online' ? (
                    <span style={{ color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Signal size={12} /> P2P MESH INTERNET</span>
                  ) : (
                    <span style={{ color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><WifiOff size={12} /> OFFLINE SATELLITE DISPATCH (Queued)</span>
                  )}
                </div>
              </div>
            )}

            {sosError && (
              <p style={{ color: 'var(--neon-red)', fontSize: '0.75rem', margin: '0.5rem 0 1rem 0', display: 'flex', justifyItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                <AlertCircle size={14} /> {sosError}
              </p>
            )}

            {/* Actions */}
            {sosStep === 4 ? (
              <button 
                onClick={() => setSosModalOpen(false)} 
                className="tactical-btn" 
                style={{ borderColor: 'var(--neon-green)', color: 'var(--neon-green)', fontSize: '0.8rem', width: '100%', textTransform: 'uppercase' }}
              >
                Return to Operational Terminal
              </button>
            ) : (
              <div style={{ color: 'var(--fg-dark)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spin" style={{ display: 'inline-block', width: '10px', height: '10px', border: '1px solid var(--neon-red)', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                <span>SECURE BROADCAST SEQUENCE IN INITIATION... DO NOT CLOSE</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '3rem', textAlign: 'center', padding: '1rem 0', borderTop: '1px solid var(--border-dim)' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--fg-dark)' }}>
          RUSSAW DECENTRALIZED PROTOCOL • BUILD VERSION MVP.2026.07.23 • SECURE TRANSMISSION ONLY
        </p>
      </footer>
    </div>
  );
}
