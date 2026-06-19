'use client';

import React, { useState, useEffect } from 'react';
import { Compass, Eye, ShieldAlert, ArrowLeft, RefreshCw, Radio, CheckCircle, Upload, AlertCircle } from 'lucide-react';

interface Mission {
  id: number;
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  radius_meters: number;
  points: number;
  is_active: boolean;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any | null>(null);

  // Verification form states
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch missions from API
  const fetchMissions = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/missions`);
      const data = await response.json();
      
      if (response.ok) {
        setMissions(data.missions || []);
      } else {
        setErrorMsg('Failed to load active operations board.');
      }
    } catch (err) {
      setErrorMsg('Gateway connection error. Ensure API service is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleSelectMission = (mission: Mission) => {
    setSelectedMission(mission);
    setSuccessData(null);
    setVerificationError('');
    setLat('');
    setLng('');
    setFile(null);
  };

  const getBrowserLocation = () => {
    if (!navigator.geolocation) {
      setVerificationError('Geolocation API not supported by browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        setVerificationError(`Location acquisition failed: ${err.message}`);
      }
    );
  };

  // Helper to test successful verification (forces match with target)
  const cheatMatchTarget = () => {
    if (!selectedMission) return;
    // Offset slightly inside geofence (e.g. 5 meters)
    setLat((selectedMission.lat + 0.00005).toFixed(6));
    setLng((selectedMission.lng + 0.00005).toFixed(6));
  };

  // Helper to test failure (places operator 2km away)
  const cheatMissTarget = () => {
    if (!selectedMission) return;
    setLat((selectedMission.lat + 0.02).toFixed(6));
    setLng((selectedMission.lng + 0.02).toFixed(6));
  };

  const copyToken = () => {
    if (successData?.receipt?.validation_token) {
      navigator.clipboard.writeText(successData.receipt.validation_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;
    
    setVerifying(true);
    setVerificationError('');
    setSuccessData(null);

    if (!lat || !lng) {
      setVerificationError('Coordinates are required.');
      setVerifying(false);
      return;
    }

    if (!file) {
      setVerificationError('Photo evidence file is required to audit this zone.');
      setVerifying(false);
      return;
    }

    const formData = new FormData();
    formData.append('mission_id', selectedMission.id.toString());
    formData.append('lat', lat);
    formData.append('lng', lng);
    formData.append('evidence', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/missions/verify`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'operator_outside_geofence') {
          setVerificationError(
            `SPATIAL GEOFENCE ERROR: You are registered at ${data.diagnostics.computed_distance_meters}m from the audit center. The allowed geofence is ${data.diagnostics.allowed_radius_meters}m.`
          );
        } else {
          setVerificationError(data.message || data.error || 'Verification transmission failed.');
        }
      } else {
        setSuccessData(data);
      }
    } catch (err) {
      setVerificationError('Gateway unreachable. Check backend container.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '850px' }}>
      {/* Return Nav */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> <span style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}>RETURN_TO_GATEWAY</span>
        </a>
        <button
          onClick={fetchMissions}
          className="tactical-btn"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> REFRESH BOARD
        </button>
      </header>

      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Radio size={24} /> MISSION BOARD
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Active field operations. Travel to the target coordinate radius, collect photo evidence, and commit verification to claim reputational status.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Missions board list */}
        <div>
          <h2 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1rem', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
            ACTIVE MISSIONS LEDGER
          </h2>

          {loading ? (
            <div className="terminal-card" style={{ textAlign: 'center', color: 'var(--fg-secondary)' }}>
              Querying active geofenced tasks...
            </div>
          ) : errorMsg ? (
            <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-red)', color: 'var(--neon-red)' }}>
              {errorMsg}
            </div>
          ) : missions.length === 0 ? (
            <div className="terminal-card" style={{ textAlign: 'center', color: 'var(--fg-dark)' }}>
              NO ACTIVE OPERATIONS SCHEDULED FOR THIS WEEK
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {missions.map((mission) => (
                <div 
                  key={mission.id} 
                  className="terminal-card terminal-border"
                  style={{ 
                    borderColor: selectedMission?.id === mission.id ? 'var(--neon-cyan)' : 'var(--border-dim)',
                    boxShadow: selectedMission?.id === mission.id ? '0 0 10px var(--neon-green-glow)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="neon-badge cyan">{mission.category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                      +{mission.points} REP POINTS
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', color: 'var(--fg-primary)' }}>{mission.title}</h3>
                  <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem 0' }}>
                    {mission.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--fg-dark)', borderTop: '1px solid var(--border-dim)', paddingTop: '0.5rem' }}>
                    <span>TARGET: <strong>{mission.lat.toFixed(4)}N, {mission.lng.toFixed(4)}E</strong></span>
                    <span>GEOFENCE RADIUS: <strong>{mission.radius_meters}m</strong></span>
                  </div>

                  <button
                    onClick={() => handleSelectMission(mission)}
                    className="tactical-btn"
                    style={{ 
                      marginTop: '1rem', 
                      width: '100%', 
                      fontSize: '0.75rem', 
                      borderColor: 'var(--neon-cyan)',
                      color: 'var(--neon-cyan)',
                      background: selectedMission?.id === mission.id ? 'rgba(0, 229, 255, 0.05)' : 'transparent'
                    }}
                  >
                    Select Operation Verification
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Console side block */}
        <div className="terminal-card" style={{ borderColor: 'var(--border-bright)', background: 'var(--bg-deep)' }}>
          {selectedMission ? (
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--neon-cyan)', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Compass size={16} /> VERIFICATION HUD: MISSION #{selectedMission.id}
              </h2>

              {!successData ? (
                /* Verification Form */
                <form onSubmit={handleVerifySubmit}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '1.5rem', borderBottom: '1px dashed var(--border-dim)', paddingBottom: '0.5rem' }}>
                    Target: <strong>{selectedMission.title}</strong><br/>
                    Allowed Range: <strong>Within {selectedMission.radius_meters} meters</strong> of <strong>{selectedMission.lat}N, {selectedMission.lng}E</strong>.
                  </p>

                  {/* Verification Error readout */}
                  {verificationError && (
                    <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-red)', background: 'rgba(255,51,51,0.05)', color: 'var(--neon-red)', fontSize: '0.8rem', padding: '0.8rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {/* Coordinates input */}
                  <label className="tactical-label">Operator Spatial Coordinates</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <span className="tactical-label" style={{ fontSize: '0.7rem' }}>Latitude</span>
                      <input
                        type="text"
                        className="tactical-input"
                        placeholder="e.g. 13.0818"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>
                    <div>
                      <span className="tactical-label" style={{ fontSize: '0.7rem' }}>Longitude</span>
                      <input
                        type="text"
                        className="tactical-input"
                        placeholder="e.g. 80.2724"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>
                  </div>

                  {/* Proximity test triggers */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={getBrowserLocation}
                      className="tactical-btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                    >
                      Browser GPS
                    </button>
                    <button
                      type="button"
                      onClick={cheatMatchTarget}
                      className="tactical-btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: 'var(--neon-green)', color: 'var(--neon-green)' }}
                    >
                      Test Fill: In Range
                    </button>
                    <button
                      type="button"
                      onClick={cheatMissTarget}
                      className="tactical-btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: 'var(--neon-red)', color: 'var(--neon-red)' }}
                    >
                      Test Fill: Off Range
                    </button>
                  </div>

                  {/* Photo upload */}
                  <label className="tactical-label">Verification Image Evidence</label>
                  <div style={{ position: 'relative', border: '1px dashed var(--border-bright)', padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem', background: 'var(--bg-elevated)' }}>
                    <input
                      type="file"
                      accept="image/jpeg, image/jpg, image/png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                      }}
                      required
                    />
                    <Upload size={20} style={{ color: 'var(--fg-secondary)', marginBottom: '0.3rem' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>
                      {file ? `[ATTACHED]: ${file.name}` : 'Click to select audit photo proof (JPEG/PNG)'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="tactical-btn"
                    disabled={verifying}
                    style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                  >
                    {verifying ? 'TRANSMITTING SPATIAL PROOF...' : 'SUBMIT PROXIMITY VERIFICATION'}
                  </button>
                </form>
              ) : (
                /* Success Readout Screen */
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ display: 'inline-flex', background: 'rgba(0, 255, 102, 0.05)', padding: '0.75rem', borderRadius: '50%', color: 'var(--neon-green)', marginBottom: '1rem' }}>
                    <CheckCircle size={36} />
                  </div>
                  
                  <h3 className="glow-text-green" style={{ color: 'var(--neon-green)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                    GEOFENCE CLEARED
                  </h3>
                  <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                    PostGIS validated location proximity. Recorded spatial difference: <strong>{successData.diagnostics.computed_distance_meters} meters</strong> (Limit: {successData.diagnostics.allowed_radius_meters}m). 
                    Awarded <strong>+{successData.diagnostics.awarded_points} Rep</strong>.
                  </p>

                  <div className="terminal-card" style={{ borderColor: 'var(--neon-green)', background: 'rgba(0,255,102,0.02)', textAlign: 'left', padding: '1.25rem' }}>
                    <span className="neon-badge green" style={{ marginBottom: '0.8rem' }}>Scout Validation Key</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', marginBottom: '0.5rem' }}>
                      Copy this validation key to unlock status inside the communication layers.
                    </p>

                    <div style={{ display: 'flex', background: 'var(--bg-pitch)', border: '1px solid var(--border-bright)', padding: '0.5rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <code style={{ fontSize: '0.75rem', color: 'var(--neon-green)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                        {successData.receipt.validation_token}
                      </code>
                      <button
                        onClick={copyToken}
                        style={{ background: 'transparent', border: 'none', color: copied ? 'var(--neon-green)' : 'var(--fg-secondary)', cursor: 'pointer' }}
                      >
                        <RefreshCw size={14} className={copied ? 'spin' : ''} />
                      </button>
                    </div>

                    <span style={{ fontSize: '0.7rem', color: 'var(--neon-red)' }}>
                      ⚠️ Keep this safe. This token is cryptographically un-linkable from your alias.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--fg-dark)' }}>
              <Radio size={36} style={{ marginBottom: '1rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                VERIFICATION HUB OFFLINE
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                SELECT AN ACTIVE OPERATION LEDGER CARD FROM THE BOARD TO INITIALIZE POSITION TELEMETRY
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
