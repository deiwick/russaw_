'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Compass, Eye, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle, Flame, Users, AlertTriangle } from 'lucide-react';

interface Report {
  id: number;
  category: string;
  title: string;
  description: string;
  evidence_url: string | null;
  status: string;
  upvotes: number;
  engaged_count: number;
  lat: number;
  lng: number;
  created_at: string;
}

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Interactive Leaflet Map states
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Local engagement states
  const [isEngaging, setIsEngaging] = useState(false);
  const [engagementLog, setEngagementLog] = useState<string[]>([]);
  const [locallyEngaged, setLocallyEngaged] = useState<{ [key: number]: boolean }>({});

  // Fetch Reports from API
  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/reports`);
      const data = await response.json();
      
      if (response.ok) {
        // Collect server reports
        let serverReports: Report[] = data.reports || [];
        
        // Append local offline S.O.S queue reports if any
        const localQueue = JSON.parse(localStorage.getItem('russaw_offline_sos_queue') || '[]');
        if (localQueue.length > 0) {
          // Exclude duplicates by ID
          const existingIds = new Set(serverReports.map(r => r.id));
          const filteredLocal = localQueue.filter((r: any) => !existingIds.has(r.id));
          serverReports = [...filteredLocal, ...serverReports];
        }

        setReports(serverReports);
        // Auto-select first report if available and none selected yet
        if (serverReports.length > 0 && !selectedReport) {
          setSelectedReport(serverReports[0]);
        }
      } else {
        setErrorMsg('Failed to load incident records.');
      }
    } catch (err) {
      setErrorMsg('Gateway offline. Displaying local offline S.O.S queue.');
      const localQueue = JSON.parse(localStorage.getItem('russaw_offline_sos_queue') || '[]');
      setReports(localQueue);
      if (localQueue.length > 0 && !selectedReport) {
        setSelectedReport(localQueue[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    // 1. Inject Leaflet CSS from CDN dynamically
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        LRef.current = L;
        
        // Prevent container already initialized error on React hot reload
        const container = L.DomUtil.get('map-leaflet');
        if (container) {
          (container as any)._leaflet_id = null;
          container.innerHTML = '';
        }

        // Initialize Map
        const map = L.map('map-leaflet', {
          center: [13.0827, 80.2707], // Chennai center
          zoom: 12,
          zoomControl: false
        });

        // Add standard OSM tiles (CSS filters in globals.css will invert to dark mode)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        mapRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('Failed to mount interactive Leaflet map:', err);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map markers when reports list or map status changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      let markerIcon;

      if (report.category === 'emergency' || report.status === 'emergency') {
        // High-contrast Flashing Siren megabeacon for S.O.S alerts
        markerIcon = L.divIcon({
          className: 'custom-leaflet-icon',
          html: `<div class="siren-marker">🚨</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      } else {
        let colorClass = 'radar-dot-red';
        if (report.status === 'verified') {
          colorClass = 'radar-dot-green';
        } else if (report.category === 'environmental') {
          colorClass = 'radar-dot-cyan';
        }

        // Create Custom Neon Pulser DivIcon
        markerIcon = L.divIcon({
          className: 'custom-leaflet-icon',
          html: `<div class="pulse-marker ${colorClass}"><span class="core-dot"></span></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
      }

      const marker = L.marker([report.lat, report.lng], { icon: markerIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedReport(report);
        });

      // Bind simple popup
      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 0.75rem; color: #fff;">
          <strong>[NODE #${report.id}]</strong><br/>
          Category: ${report.category.toUpperCase()}<br/>
          Status: ${report.status.toUpperCase()}
        </div>
      `);

      markersRef.current.push(marker);
    });

    // Pan to selected report
    if (selectedReport) {
      map.panTo([selectedReport.lat, selectedReport.lng]);
    }
  }, [reports, mapReady, selectedReport]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEngageOperation = async (reportId: number) => {
    setIsEngaging(true);
    const logTime = new Date().toLocaleTimeString();
    setEngagementLog(prev => [...prev, `[${logTime}] Establishing connection to satellite beacon...`]);

    try {
      // Check if report is local offline
      const isLocalSos = reports.find(r => r.id === reportId)?.description.includes('OFFLINE');
      
      if (isLocalSos || !navigator.onLine) {
        // Handle offline simulation
        setTimeout(() => {
          setEngagementLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] S.O.S satellite link active. Dispatch queued locally.`]);
          setEngagementLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Operator alias registered in rescue dispatch roster.`]);
          
          setLocallyEngaged(prev => ({ ...prev, [reportId]: true }));
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, engaged_count: (r.engaged_count || 0) + 1 } : r));
          if (selectedReport && selectedReport.id === reportId) {
            setSelectedReport(prev => prev ? { ...prev, engaged_count: (prev.engaged_count || 0) + 1 } : null);
          }
          setIsEngaging(false);
        }, 1500);
      } else {
        // Send actual engagement call to API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/reports/${reportId}/engage`, { method: 'POST' });
        
        if (response.ok) {
          const data = await response.json();
          setTimeout(() => {
            setEngagementLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Mesh registry updated. Dispatch coordinates synchronizing.`]);
            setEngagementLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Target locked: [${selectedReport?.lat.toFixed(5)}N, ${selectedReport?.lng.toFixed(5)}E]. Deploying.`]);
            
            setLocallyEngaged(prev => ({ ...prev, [reportId]: true }));
            // Increment locally in reports array
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, engaged_count: data.report.engaged_count } : r));
            setSelectedReport(prev => prev ? { ...prev, engaged_count: data.report.engaged_count } : null);
            setIsEngaging(false);
          }, 1500);
        } else {
          setEngagementLog(prev => [...prev, `[ERROR] Failed to synchronize dispatch. Mesh connection degraded.`]);
          setIsEngaging(false);
        }
      }
    } catch (err) {
      setEngagementLog(prev => [...prev, `[ERROR] Satcom failure. Triangulation coordinates lost.`]);
      setIsEngaging(false);
    }
  };

  const getMimeBadgeClass = (category: string) => {
    switch (category) {
      case 'emergency': return 'red';
      case 'infrastructure': return 'cyan';
      case 'injustice': return 'red';
      default: return 'green';
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '950px' }}>
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
          <Compass size={24} /> THE MAP GRID
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Real Chennai City Spatial Audit. Interactive satellite overlays displaying operational nodes, live emergency reports, and rescue coordinates.
        </p>
      </div>

      {/* Operational Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start', gridTemplateRows: 'auto' }}>
        
        {/* Interactive Map Column */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="terminal-card" style={{ padding: '0.25rem', background: '#000000', height: '400px', position: 'relative', border: '1px solid var(--border-bright)' }}>
            <div 
              id="map-leaflet" 
              style={{ width: '100%', height: '100%', background: '#000' }}
            />
            {!mapReady && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.85)', gap: '0.5rem', color: 'var(--neon-cyan)', fontSize: '0.8rem' }}>
                <span className="spin" style={{ width: '16px', height: '16px', border: '2px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                <span>INITIALIZING SATELLITE TILES...</span>
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', display: 'block', marginTop: '0.5rem', textAlign: 'center' }}>
            OPERATING OVER OPENSTREETMAP GRID • TAP MARKER TO LOCK TELEMETRY
          </span>
        </div>

        {/* HUD side panel Column */}
        <div className="terminal-card" style={{ borderColor: 'var(--border-bright)', background: 'var(--bg-deep)', gridColumn: 'span 1', minHeight: '400px' }}>
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

              {selectedReport.category === 'emergency' && (
                <div style={{ border: '1px solid var(--neon-red)', background: 'rgba(255, 51, 51, 0.05)', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--neon-red)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  <Flame size={14} style={{ animation: 'alert-flash 1s infinite alternate' }} />
                  <span>S.O.S ACTIVE: ENGAGE RESCUE OPERATION IMMEDIATELY</span>
                </div>
              )}

              <h3 style={{ fontSize: '1.25rem', color: 'var(--fg-primary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {selectedReport.title}
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--fg-secondary)', marginBottom: '1rem' }}>
                <span>GPS: <strong>{selectedReport.lat.toFixed(5)}N, {selectedReport.lng.toFixed(5)}E</strong></span>
                <span>STATUS: 
                  <strong style={{ color: selectedReport.category === 'emergency' ? 'var(--neon-red)' : selectedReport.status === 'verified' ? 'var(--neon-green)' : 'var(--neon-red)', marginLeft: '0.3rem' }}>
                    {selectedReport.status.toUpperCase()}
                  </strong>
                </span>
              </div>

              <p style={{ color: 'var(--fg-primary)', fontSize: '0.85rem', lineHeight: '1.5', background: 'var(--bg-elevated)', padding: '0.75rem', border: '1px solid var(--border-dim)', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {selectedReport.description}
              </p>

              {/* Evidence photo preview */}
              {selectedReport.evidence_url ? (
                <div style={{ marginBottom: '1rem' }}>
                  <span className="tactical-label" style={{ marginBottom: '0.4rem', fontSize: '0.75rem' }}>EVIDENCE REPORT PHOTOGRAPH</span>
                  <div style={{ border: '1px solid var(--border-dim)', background: 'var(--bg-pitch)', padding: '0.4rem' }}>
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000'}${selectedReport.evidence_url}`}
                      alt="Leaked Evidence"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid var(--border-bright)' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="terminal-card" style={{ textAlign: 'center', padding: '0.75rem', borderStyle: 'dashed', color: 'var(--fg-secondary)', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  NO BINARY EVIDENCE LOGGED
                </div>
              )}

              {/* Engage rescue operation trigger */}
              <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users size={14} /> ACTIVE DISPATCHED SCOUTS: <strong style={{ color: 'var(--neon-cyan)' }}>{selectedReport.engaged_count || 0}</strong>
                  </span>
                  {locallyEngaged[selectedReport.id] && (
                    <span className="neon-badge green" style={{ fontSize: '0.65rem' }}>DISPATCHED</span>
                  )}
                </div>

                <button
                  onClick={() => handleEngageOperation(selectedReport.id)}
                  disabled={isEngaging || locallyEngaged[selectedReport.id]}
                  className={`tactical-btn ${selectedReport.category === 'emergency' ? 'danger' : 'primary'}`}
                  style={{ width: '100%', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  {locallyEngaged[selectedReport.id] 
                    ? '✓ DISPATCH CONFIRMED' 
                    : isEngaging 
                      ? 'SYNCING SATELLITE DEPLOYMENT...' 
                      : selectedReport.category === 'emergency' 
                        ? 'ENGAGE IN RESCUE OPERATION' 
                        : 'ENGAGE IN AUDIT OPERATION'
                  }
                </button>
              </div>

              {/* Real-time sync logs */}
              {engagementLog.length > 0 && (
                <div className="terminal-card" style={{ marginTop: '1rem', background: '#000', borderColor: 'var(--border-dim)', padding: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                  {engagementLog.map((log, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--fg-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={36} style={{ marginBottom: '1rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                GRID COMPASS OFFLINE
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                TAP A RADAR PIN POINT ON THE CHENNAI MAP GRID TO INTERCEPT DATA
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
