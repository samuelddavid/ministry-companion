import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, register }     = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else                  await register(email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        setError('Invalid email or password.');
      else if (err.code === 'auth/email-already-in-use')
        setError('This email is already registered. Please sign in.');
      else if (err.code === 'auth/invalid-email')
        setError('Please enter a valid email address.');
      else
        setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900
      flex flex-col items-center justify-center p-6">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-teal-500/20 border border-teal-400/30 rounded-3xl
          flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-teal-300" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Ministry</h1>
          <p className="text-teal-300/70 text-sm mt-1">Companion</p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
          {[['login','Sign In'],['register','Create Account']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${mode === m ? 'bg-teal-500 text-white' : 'text-white/40'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">
            {mode === 'login' ? 'Welcome back' : 'Join your congregation'}
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field" required autoComplete="email" />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="input-field pr-12" required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-1">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Confirm Password</label>
                <input type={showPass ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" className="input-field" required autoComplete="new-password" />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-5">
          Ministry Companion · Bhopal Congregation
        </p>
      </div>
    </div>
  );
}
