'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Eye, ShieldAlert, ArrowLeft, Send, Terminal, LogOut, Key, UserPlus, Lock } from 'lucide-react';

interface Post {
  id: number;
  operator_alias: string;
  message: string;
  created_at: string;
}

export default function NetworkPage() {
  // Authentication states
  const [token, setToken] = useState<string | null>(null);
  const [operatorAlias, setOperatorAlias] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');

  // Input fields
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [validationToken, setValidationToken] = useState('');

  // Interface states
  const [posts, setPosts] = useState<Post[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load token from storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('russaw_op_token');
    const savedAlias = localStorage.getItem('russaw_op_alias');
    if (savedToken && savedAlias) {
      setToken(savedToken);
      setOperatorAlias(savedAlias);
      fetchForumPosts(savedToken);
    }
  }, []);

  // Fetch Forum postings
  const fetchForumPosts = async (authToken: string) => {
    setLoadingPosts(true);
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/operators/forum`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts || []);
      } else {
        // Token might have expired
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          setErrorMsg('Session expired. Signature re-authorization required.');
        } else {
          setErrorMsg('Failed to establish contact with private forum ledger.');
        }
      }
    } catch (err) {
      setErrorMsg('Gateway connection error. Verify backend stack is running.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('russaw_op_token');
    localStorage.removeItem('russaw_op_alias');
    setToken(null);
    setOperatorAlias(null);
    setPosts([]);
    setErrorMsg('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    const endpoint = authTab === 'register' ? 'register' : 'login';
    const payload = authTab === 'register' 
      ? { alias, password, validation_token: validationToken }
      : { alias, password };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/operators/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.message || data.error || 'Authentication sequence failed.');
      } else {
        localStorage.setItem('russaw_op_token', data.token);
        localStorage.setItem('russaw_op_alias', data.operator.alias);
        setToken(data.token);
        setOperatorAlias(data.operator.alias);
        // Load posts
        fetchForumPosts(data.token);
        // Clear forms
        setAlias('');
        setPassword('');
        setValidationToken('');
      }
    } catch (err) {
      setErrorMsg('Gateway contact failure. Verify API gateway is operational.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/operators/forum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewMessage('');
        // Insert new post at top of list
        setPosts(prev => [data.post, ...prev]);
      } else {
        setErrorMsg(data.message || data.error || 'Failed to transmit message.');
      }
    } catch (err) {
      setErrorMsg('Failed to broadcast message to ledger.');
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '850px' }}>
      {/* Return Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> <span style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}>RETURN_TO_GATEWAY</span>
        </a>
        {token && (
          <button
            onClick={handleLogout}
            className="tactical-btn danger"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <LogOut size={12} /> SHUTDOWN SESSION
          </button>
        )}
      </header>

      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="glow-text-green" style={{ fontSize: '1.8rem', color: 'var(--neon-orange)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={24} /> OPERATOR NETWORK
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Invite-only operator channel. Unlocked exclusively by consuming validation hashes. Plan operations and view collective communications.
        </p>
      </div>

      {errorMsg && (
        <div className="terminal-card" style={{ borderLeft: '4px solid var(--neon-red)', background: 'rgba(255,51,51,0.05)', color: 'var(--neon-red)', fontSize: '0.85rem', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <ShieldAlert size={16} />
          <span>[SECURITY_LOG]: {errorMsg}</span>
        </div>
      )}

      {/* Main Grid Interface */}
      {!token ? (
        /* ================= AUTHENTICATION HUD ================= */
        <main style={{ maxWidth: '500px', margin: '0 auto' }}>
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setAuthTab('register')}
              style={{
                flex: 1, padding: '1rem', background: 'transparent', border: 'none',
                color: authTab === 'register' ? 'var(--neon-orange)' : 'var(--fg-secondary)',
                borderBottom: authTab === 'register' ? '2px solid var(--neon-orange)' : 'none',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <UserPlus size={14} /> INITIALIZE ALIAS
            </button>
            <button
              onClick={() => setAuthTab('login')}
              style={{
                flex: 1, padding: '1rem', background: 'transparent', border: 'none',
                color: authTab === 'login' ? 'var(--neon-orange)' : 'var(--fg-secondary)',
                borderBottom: authTab === 'login' ? '2px solid var(--neon-orange)' : 'none',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <Lock size={14} /> SIGNATURE CHECK
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="terminal-card" style={{ borderColor: 'var(--neon-orange)', background: 'var(--bg-deep)' }}>
            <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
              Authentication Protocol: {authTab === 'register' ? 'Claim Validation Token' : 'Verifying Identity Hash'}
            </div>

            {authTab === 'register' && (
              <>
                <label className="tactical-label">Action Validation Token</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="tactical-input"
                    placeholder="e.g. 32-byte hex token received from reporting"
                    value={validationToken}
                    onChange={(e) => setValidationToken(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  Key obtained by filing a report in The Void or verifying a Mission Board geofence.
                </span>
              </>
            )}

            <label className="tactical-label">Operator Pseudonymous Alias</label>
            <input
              type="text"
              className="tactical-input"
              placeholder="e.g. GhostOperator_44"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
            />

            <label className="tactical-label">Operational Security Password</label>
            <input
              type="password"
              className="tactical-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="tactical-btn"
              disabled={formLoading}
              style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)', marginTop: '1rem' }}
            >
              {formLoading ? 'VERIFYING CREDENTIALS...' : authTab === 'register' ? 'CONSUME KEY & ACCESS' : 'AUTHORIZE ACCESS'}
            </button>
          </form>

          {/* Secure details reminder */}
          <div className="terminal-card" style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--fg-dark)', borderStyle: 'dashed' }}>
            🔒 RUSSAW SECURE AUTH: Validation keys are stored in hashed state (`SHA-256`) inside the database to decouple identity from reporting logs. Choose passwords with high entropy.
          </div>
        </main>
      ) : (
        /* ================= OPERATOR FORUM HUB ================= */
        <main style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Operator Profile Hud */}
          <div className="terminal-card" style={{ borderColor: 'var(--neon-orange)', background: 'rgba(255, 153, 0, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Terminal size={20} style={{ color: 'var(--neon-orange)' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>OPERATOR ALIAS</span>
                  <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>@{operatorAlias}</h3>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>STATUS LEVEL</span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--neon-orange)', fontWeight: 'bold' }}>TIER 2 // SCOUT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Message Input Form */}
          <div className="terminal-card" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-dim)' }}>
            <span className="tactical-label" style={{ marginBottom: '0.5rem', color: 'var(--neon-orange)' }}>Broadcast New Core Transmission</span>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="tactical-input"
                placeholder="Type operational intel to broadcast to other Chennai scouts..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ margin: 0, flex: 1 }}
                required
              />
              <button
                type="submit"
                className="tactical-btn"
                style={{ borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}
              >
                <Send size={14} /> TRANSMIT
              </button>
            </form>
          </div>

          {/* Live Forum postings stream */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#ffffff' }}>
                SECURE COMMUNICATION TRANSMISSIONS
              </h2>
              <button
                onClick={() => fetchForumPosts(token)}
                className="tactical-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                disabled={loadingPosts}
              >
                {loadingPosts ? 'REFRESHING...' : 'REFRESH STREAM'}
              </button>
            </div>

            {loadingPosts && posts.length === 0 ? (
              <div className="terminal-card" style={{ textAlign: 'center', color: 'var(--fg-secondary)' }}>
                Syncing secure messaging channels...
              </div>
            ) : posts.length === 0 ? (
              <div className="terminal-card" style={{ textAlign: 'center', color: 'var(--fg-dark)', borderStyle: 'dashed' }}>
                NO MESSAGES BROADCAST YET ON THIS CHENNAI NODE CHANNEL
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="terminal-card" 
                    style={{ 
                      borderColor: 'var(--border-dim)',
                      borderLeft: '4px solid var(--neon-orange)',
                      background: 'var(--bg-deep)',
                      marginBottom: 0
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--fg-secondary)', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--neon-orange)', fontWeight: 'bold' }}>
                        @{post.operator_alias}
                      </span>
                      <span>
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--fg-primary)', fontSize: '0.9rem', lineHeight: '1.4', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {post.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
