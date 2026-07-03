import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Target, Save, CheckCircle, Loader2, ChevronRight, BookOpen } from 'lucide-react';

const ROLES = [
  { value: 'publisher',          label: 'Publisher',         hours: 0  },
  { value: 'auxiliary-pioneer',  label: 'Auxiliary Pioneer', hours: 30 },
  { value: 'regular-pioneer',    label: 'Regular Pioneer',   hours: 50 },
  { value: 'special-pioneer',    label: 'Special Pioneer',   hours: 70 },
];

export default function SettingsPage() {
  const { userProfile, saveProfile, currentUser } = useAuth();

  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName,  setLastName]  = useState(userProfile?.lastName  || '');
  const [role,      setRole]      = useState(userProfile?.role      || 'publisher');
  const [hourGoal,  setHourGoal]  = useState(String(userProfile?.hourGoal || ''));
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

  async function handleSave(e) {
    e.preventDefault();
    if (!firstName.trim()) { setError('First name is required.'); return; }
    setError(''); setSaving(true); setSaved(false);
    try {
      await saveProfile({ firstName, lastName, role, hourGoal });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Could not save. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col h-full px-4 pt-4 overflow-y-auto pb-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-white/50 text-sm">Manage your profile and preferences</p>
      </div>

      {/* Account info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-teal-300 text-lg font-bold">
            {(userProfile?.firstName || '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-white font-semibold">{userProfile?.name || '—'}</p>
          <p className="text-white/40 text-sm">{currentUser?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile section */}
        <div>
          <p className="section-title">Profile</p>
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">First Name *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="input-field" placeholder="Samuel" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className="input-field" placeholder="David" />
              </div>
            </div>
          </div>
        </div>

        {/* Role section */}
        <div>
          <p className="section-title">Role</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button key={r.value} type="button" onClick={() => {
                setRole(r.value);
                if (r.hours > 0) setHourGoal(String(r.hours));
              }}
                className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all text-left
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
          <p className="section-title">Monthly Hour Goal</p>
          <div className="card">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-teal-300 flex-shrink-0" />
              <input type="number" min="1" max="200" value={hourGoal}
                onChange={e => setHourGoal(e.target.value)}
                className="input-field" placeholder="e.g. 50" />
            </div>
            <p className="text-white/25 text-xs mt-2 ml-8">
              Your progress bar on the dashboard tracks against this goal
            </p>
          </div>
        </div>

        {/* App info */}
        <div>
          <p className="section-title">About</p>
          <div className="card space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-white/60 text-sm">App</span>
              <span className="text-white/40 text-sm">Ministry Companion</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-white/60 text-sm">Version</span>
              <span className="text-white/40 text-sm">1.1.0</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-white/60 text-sm">Congregation</span>
              <span className="text-white/40 text-sm">Bhopal</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={saving}
          className={`btn-primary w-full transition-all ${saved ? 'bg-green-600 hover:bg-green-500' : ''}`}>
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : saved
            ? <><CheckCircle className="w-4 h-4" /> Saved!</>
            : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
