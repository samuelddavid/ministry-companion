import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Loader2, Target } from 'lucide-react';

const ROLES = [
  { value: 'publisher',          label: 'Publisher',         hours: 0  },
  { value: 'auxiliary-pioneer',  label: 'Auxiliary Pioneer', hours: 30 },
  { value: 'regular-pioneer',    label: 'Regular Pioneer',   hours: 50 },
  { value: 'special-pioneer',    label: 'Special Pioneer',   hours: 70 },
];

export default function SetupProfile() {
  const { saveProfile, currentUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [role,      setRole]      = useState('publisher');
  const [hourGoal,  setHourGoal]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function handleRoleSelect(r) {
    setRole(r.value);
    if (r.hours > 0) setHourGoal(String(r.hours));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim()) { setError('First name is required.'); return; }
    setError(''); setLoading(true);
    try {
      await saveProfile({ firstName, lastName, role, hourGoal });
    } catch (err) {
      setError('Could not save. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900
      flex flex-col items-center justify-center p-6">

      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-teal-500/20 border border-teal-400/30 rounded-2xl
          flex items-center justify-center">
          <User className="w-8 h-8 text-teal-300" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">One last step!</h1>
          <p className="text-teal-300/70 text-sm mt-1">Tell us a little about yourself</p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <div className="card">
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">First Name *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Samuel" className="input-field" autoFocus autoComplete="given-name" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="David" className="input-field" autoComplete="family-name" />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Your Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => handleRoleSelect(r)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left
                      ${role === r.value
                        ? 'bg-teal-500/30 border-teal-400/50 text-teal-100'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                    {r.label}
                    {r.hours > 0 && (
                      <span className={`block text-xs mt-0.5 ${role === r.value ? 'text-teal-300' : 'text-white/25'}`}>
                        {r.hours} hrs/month
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour goal */}
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Monthly Hour Goal
              </label>
              <input type="number" min="1" max="200" value={hourGoal}
                onChange={e => setHourGoal(e.target.value)}
                placeholder="e.g. 50" className="input-field" />
              <p className="text-white/25 text-xs mt-1">
                This shows your progress on the dashboard
              </p>
            </div>

            <button type="submit" disabled={loading || !firstName.trim()} className="btn-primary w-full">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : "Let's Go →"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-4">{currentUser?.email}</p>
      </div>
    </div>
  );
}
