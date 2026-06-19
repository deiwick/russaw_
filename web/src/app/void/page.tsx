'use client';

import React, { useState } from 'react';
import { Eye, ShieldAlert, ArrowLeft, CheckCircle2, Copy, AlertOctagon, Upload, Compass } from 'lucide-react';

export default function VoidPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Chennai Coordinates Quick Fill Helper (for testing/easy usage)
  const quickFillChennai = () => {
    // Random coordinate in central Chennai
    const randomOffsetLat = (Math.random() - 0.5) * 0.1;
    const randomOffsetLng = (Math.random() - 0.5) * 0.1;
    setLat((13.0827 + randomOffsetLat).toFixed(4));
    setLng((80.2707 + randomOffsetLng).toFixed(4));
  };

  const getBrowserLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation API is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      (err) => {
        setErrorMsg(`Location retrieval failed: ${err.message}. Input coordinates manually for security.`);
      }
    );
  };

  const copyToken = () => {
    if (successData?.receipt?.validation_token) {
      navigator.clipboard.writeText(successData.receipt.validation_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    if (!title || !description || !category || !lat || !lng) {
      setErrorMsg('All fields, including geospatial coordinates, are required.');
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('lat', lat);
    formData.append('lng', lng);
    if (file) {
      formData.append('evidence', file);
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/reports`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.message || data.error || 'Filing failed. Check coordinates and file size.');
      } else {
        setSuccessData(data);
      }
    } catch (err: any) {
      setErrorMsg('Failed to establish contact with the gateway ledger. Ensure API service is live.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="/" style={{ color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> <span style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}>RETURN_TO_GATEWAY</span>
        </a>
      </header>

      {/* Main Feature Container */}
      {!successData ? (
        <main>
          {/* Section title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Eye size={24} /> THE VOID
            </h1>
            <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
              Encrypted Report Entry Node. Upload anomalies and infrastructure failures anonymously.
            </p>
          </div>

          {/* Operational Warnings Banner */}
          <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-red)', background: 'rgba(255, 51, 51, 0.02)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldAlert size={20} style={{ color: 'var(--neon-red)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ color: 'var(--neon-red)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Operator Safety Notice
                </p>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Our API strips EXIF (GPS, time, camera tags) from image buffers instantly. However, browser location APIs leave traces in your local browser logs. We recommend manually typing coordinates or utilizing offline GPS.
                </p>
              </div>
            </div>
          </div>

          {/* Error Channel */}
          {errorMsg && (
            <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-red)', borderColor: 'var(--neon-red)', padding: '1rem', background: 'rgba(255,51,51,0.05)', color: 'var(--neon-red)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <AlertOctagon size={16} />
              <span>[ERROR_LOG]: {errorMsg}</span>
            </div>
          )}

          {/* Reporting Form */}
          <form onSubmit={handleSubmit}>
            <label className="tactical-label">Incident Category</label>
            <select
              className="tactical-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="infrastructure">Infrastructure Failure (Leaking, Roads, Power)</option>
              <option value="injustice">Social Injustice / Harassment</option>
              <option value="environmental">Environmental Neglect (Trash, Industrial Spills)</option>
            </select>

            <label className="tactical-label">Report Title</label>
            <input
              type="text"
              className="tactical-input"
              placeholder="e.g., Water pipeline leak on Mount Road"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label className="tactical-label">Detailed Description</label>
            <textarea
              className="tactical-textarea"
              rows={4}
              placeholder="Explain the failure, duration, severity, and any responsible agencies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>

            {/* Coordinates Input Section */}
            <div style={{ border: '1px solid var(--border-dim)', padding: '1rem', marginBottom: '1.5rem', background: 'var(--bg-deep)' }}>
              <span className="tactical-label" style={{ marginBottom: '0.8rem' }}>Geospatial Coordinates (Chennai Grid Only)</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="tactical-label" style={{ fontSize: '0.75rem' }}>Latitude</label>
                  <input
                    type="text"
                    className="tactical-input"
                    placeholder="e.g., 13.0827"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    style={{ marginBottom: 0 }}
                    required
                  />
                </div>
                <div>
                  <label className="tactical-label" style={{ fontSize: '0.75rem' }}>Longitude</label>
                  <input
                    type="text"
                    className="tactical-input"
                    placeholder="e.g., 80.2707"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    style={{ marginBottom: 0 }}
                    required
                  />
                </div>
              </div>

              {/* Geo helpers buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={getBrowserLocation}
                  className="tactical-btn"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                >
                  <Compass size={12} /> Browser GPS
                </button>
                <button
                  type="button"
                  onClick={quickFillChennai}
                  className="tactical-btn"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--fg-secondary)', color: 'var(--fg-secondary)' }}
                >
                  Quick Test Grid (Chennai)
                </button>
              </div>
            </div>

            {/* Evidence Upload */}
            <label className="tactical-label">Evidence Upload (JPEG/PNG only)</label>
            <div style={{ position: 'relative', border: '1px dashed var(--border-bright)', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', background: 'var(--bg-elevated)' }}>
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
              />
              <Upload size={24} style={{ color: 'var(--fg-secondary)', marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>
                {file ? `[SELECTED]: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Drag and drop or click to attach evidence photo (Max 5MB)'}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="tactical-btn danger"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {submitting ? 'COMMITTING TO LEDGER...' : 'TRANSMIT REPORT ANONYMOUSLY'}
            </button>
          </form>
        </main>
      ) : (
        /* Success Screen */
        <main style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignContent: 'center', justifyContent: 'center', background: 'rgba(0, 255, 102, 0.05)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--neon-green)' }}>
            <CheckCircle2 size={48} className="glow-text-green" />
          </div>

          <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-green)', marginBottom: '0.5rem' }}>
            TRANSMISSION SECURED
          </h1>
          <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Your anonymous report was written to the decentralized PostGIS ledger. Incident ID: #{successData.report.id}.
          </p>

          {/* Validation receipt container */}
          <div className="terminal-card" style={{ borderColor: 'var(--neon-green)', background: 'rgba(0, 255, 102, 0.02)', textAlign: 'left', padding: '1.5rem' }}>
            <span className="neon-badge green" style={{ marginBottom: '1rem' }}>Operator Validation Key</span>
            
            <p style={{ color: 'var(--fg-primary)', fontSize: '0.85rem', marginBottom: '0.8rem', lineHeight: '1.4' }}>
              Copy the key below. Use it on the network page to claim operator status. 
            </p>

            <div style={{ display: 'flex', background: 'var(--bg-pitch)', border: '1px solid var(--border-bright)', padding: '0.75rem', borderRadius: '2px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <code style={{ fontSize: '0.8rem', color: 'var(--neon-green)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                {successData.receipt.validation_token}
              </code>
              <button
                onClick={copyToken}
                style={{ background: 'transparent', border: 'none', color: copied ? 'var(--neon-green)' : 'var(--fg-secondary)', cursor: 'pointer', marginLeft: '1rem' }}
                title="Copy Key"
              >
                <Copy size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--neon-red)', fontWeight: 'bold' }}>
              ⚠️ WARNING: We do not store this plain token. Cryptographically, only its SHA-256 hash is recorded. If you navigate away or lose this token, you cannot claim operator verification. Save it offline now.
            </p>
          </div>

          {/* Post-submit Nav */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
            <a href="/map" className="tactical-btn primary" style={{ fontSize: '0.8rem' }}>
              View Map Grid
            </a>
            <a href="/" className="tactical-btn" style={{ fontSize: '0.8rem' }}>
              Return Home
            </a>
          </div>
        </main>
      )}
    </div>
  );
}
