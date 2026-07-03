import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import {
  MapPin, Plus, Phone, User, Landmark, X, Share2,
  Clock, CheckCircle, AlertCircle, XCircle, BookOpen,
  ChevronDown, Navigation, Bell, Trash2
} from 'lucide-react';

const STATUS_CONFIG = {
  interested: { label: 'Interested', color: 'bg-green-500/20 text-green-300 border-green-400/30', icon: CheckCircle },
  'not-home': { label: 'Not Home', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icon: Clock },
  'bible-study': { label: 'Bible Study', color: 'bg-teal-500/20 text-teal-300 border-teal-400/30', icon: BookOpen },
  'do-not-call': { label: 'Do Not Call', color: 'bg-red-500/20 text-red-300 border-red-400/30', icon: XCircle },
  new: { label: 'New Contact', color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: User },
};

export default function ReturnVisitsPage() {
  const { currentUser } = useAuth();
  const [visits, setVisits] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    name: '', contact: '', landmark: '', notes: '',
    status: 'new', reminderDate: '', lat: null, lng: null
  });
  const [locating, setLocating] = useState(false);
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, 'returnVisits', uid, 'visits');
    const unsub = onSnapshot(colRef, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setVisits(data);
    });
    return unsub;
  }, [uid]);

  function captureLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave() {
    if (!form.name) return;
    const colRef = collection(db, 'returnVisits', uid, 'visits');
    await addDoc(colRef, {
      ...form,
      createdAt: new Date().toISOString()
    });
    setForm({ name: '', contact: '', landmark: '', notes: '', status: 'new', reminderDate: '', lat: null, lng: null });
    setShowAdd(false);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, 'returnVisits', uid, 'visits', id));
    setSelected(null);
  }

  async function updateStatus(id, status) {
    await updateDoc(doc(db, 'returnVisits', uid, 'visits', id), { status });
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  }

  function shareVisit(visit) {
    const mapsUrl = visit.lat && visit.lng
      ? `https://maps.google.com/?q=${visit.lat},${visit.lng}`
      : '';
    const text = `Return Visit\n👤 ${visit.name}\n${visit.contact ? '📞 ' + visit.contact + '\n' : ''}${visit.landmark ? '📍 ' + visit.landmark + '\n' : ''}${mapsUrl ? '🗺️ ' + mapsUrl : ''}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  }

  const filtered = filterStatus === 'all'
    ? visits
    : visits.filter(v => v.status === filterStatus);

  const upcomingReminders = visits.filter(v =>
    v.reminderDate && (isToday(new Date(v.reminderDate)) || isTomorrow(new Date(v.reminderDate)))
  );

  return (
    <div className="flex flex-col h-full px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-white">Return Visits</h1>
          <p className="text-white/50 text-sm">{visits.length} contacts saved</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Upcoming reminders banner */}
      {upcomingReminders.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-300 flex-shrink-0" />
          <p className="text-yellow-200 text-sm">
            <strong>{upcomingReminders.length}</strong> return visit{upcomingReminders.length > 1 ? 's' : ''} due today/tomorrow
          </p>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {[['all', 'All'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              filterStatus === key
                ? 'bg-teal-500 border-teal-400 text-white'
                : 'bg-white/5 border-white/10 text-white/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-safe">
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <MapPin className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No return visits yet</p>
            <p className="text-white/25 text-xs mt-1">Tap Add to save a contact's location</p>
          </div>
        ) : (
          filtered.map(visit => {
            const cfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.new;
            const StatusIcon = cfg.icon;
            const isReminderDue = visit.reminderDate && (isToday(new Date(visit.reminderDate)) || isPast(new Date(visit.reminderDate)));
            return (
              <button
                key={visit.id}
                onClick={() => setSelected(visit)}
                className={`w-full text-left rounded-2xl p-4 border transition-all hover:brightness-110
                  ${visit.status === 'bible-study' ? 'bg-teal-500/10 border-teal-400/20' :
                    visit.status === 'interested' ? 'bg-green-500/10 border-green-400/20' :
                    visit.status === 'not-home' ? 'bg-yellow-500/10 border-yellow-400/20' :
                    visit.status === 'do-not-call' ? 'bg-red-500/10 border-red-400/20' :
                    'bg-blue-500/10 border-blue-400/20'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{visit.name}</p>
                        {isReminderDue && <Bell className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                      {visit.landmark && (
                        <p className="text-white/50 text-xs mt-0.5 truncate">{visit.landmark}</p>
                      )}
                      {visit.reminderDate && (
                        <p className={`text-xs mt-0.5 ${isReminderDue ? 'text-yellow-400' : 'text-white/30'}`}>
                          Reminder: {format(new Date(visit.reminderDate), 'd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-teal-900 border border-white/10 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">New Return Visit</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Name *</label>
                <input className="input-field" placeholder="Contact's name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Phone Number</label>
                <input className="input-field" placeholder="+91 98765 43210" value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} type="tel" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Landmark / Address</label>
                <input className="input-field" placeholder="Near 10 No Market, Flat 3B" value={form.landmark}
                  onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Status</label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k} className="bg-teal-900">{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Follow-up Reminder</label>
                <input className="input-field" type="date" value={form.reminderDate}
                  onChange={e => setForm(f => ({ ...f, reminderDate: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Notes</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Topics discussed, interests..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* GPS */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Save Location</p>
                    <p className="text-xs text-white/40">
                      {form.lat ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : 'Tap to capture GPS pin'}
                    </p>
                  </div>
                  <button
                    onClick={captureLocation}
                    disabled={locating}
                    className={`btn-secondary py-2 px-3 text-sm ${form.lat ? 'border-green-400/40 text-green-300' : ''}`}
                  >
                    <MapPin className="w-4 h-4" />
                    {locating ? 'Getting...' : form.lat ? 'Captured ✓' : 'Capture'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={!form.name} className="btn-primary flex-1">Save Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <VisitDetail
          visit={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onShare={shareVisit}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  );
}

function VisitDetail({ visit, onClose, onDelete, onShare, onStatusChange }) {
  const cfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.new;

  function openMaps() {
    if (visit.lat && visit.lng) {
      window.open(`https://maps.google.com/?q=${visit.lat},${visit.lng}`, '_blank');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="bg-teal-900 border border-white/10 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">{visit.name}</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${cfg.color} mb-4 inline-block`}>
          {cfg.label}
        </span>

        <div className="space-y-3 mt-3">
          {visit.contact && (
            <a href={`tel:${visit.contact}`} className="card flex items-center gap-3 hover:bg-white/15 transition-colors">
              <Phone className="w-4 h-4 text-teal-300" />
              <span className="text-white">{visit.contact}</span>
            </a>
          )}
          {visit.landmark && (
            <div className="card flex items-center gap-3">
              <Landmark className="w-4 h-4 text-teal-300" />
              <span className="text-white/80">{visit.landmark}</span>
            </div>
          )}
          {visit.notes && (
            <div className="card">
              <p className="section-title">Notes</p>
              <p className="text-white/80 text-sm">{visit.notes}</p>
            </div>
          )}
          {visit.reminderDate && (
            <div className="card flex items-center gap-3">
              <Bell className="w-4 h-4 text-yellow-300" />
              <span className="text-white/80 text-sm">Follow up: {format(new Date(visit.reminderDate), 'd MMMM yyyy')}</span>
            </div>
          )}
          {visit.lat && (
            <div className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-teal-300" />
                <div>
                  <p className="text-white text-sm">Location saved</p>
                  <p className="text-white/40 text-xs">{visit.lat.toFixed(4)}, {visit.lng.toFixed(4)}</p>
                </div>
              </div>
              <button onClick={openMaps} className="btn-secondary py-1.5 px-3 text-xs">
                <Navigation className="w-3 h-3" /> Open
              </button>
            </div>
          )}
        </div>

        {/* Update status */}
        <div className="mt-4">
          <p className="section-title">Update Status</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button
                key={k}
                onClick={() => onStatusChange(visit.id, k)}
                className={`text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                  visit.status === k ? v.color : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => onShare(visit)} className="btn-secondary flex-1 text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={() => onDelete(visit.id)} className="btn-danger flex-1 text-sm">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
