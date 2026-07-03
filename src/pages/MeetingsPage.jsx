import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { format, nextDay, isToday, isTomorrow } from 'date-fns';
import { Calendar, Clock, Bell, BellOff, Plus, Trash2, Check, X } from 'lucide-react';
import { getNextOccurrence } from '../utils/dateHelpers';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCountdownLabel(date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, d MMM');
}

export default function MeetingsPage() {
  const { currentUser } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDay, setNewDay] = useState('0');
  const [newTime, setNewTime] = useState('07:00');
  const [newLabel, setNewLabel] = useState('');
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'meetings', uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setSchedule(snap.data().schedule || []);
      }
    });
    return unsub;
  }, [uid]);

  async function saveSchedule(updated) {
    const ref = doc(db, 'meetings', uid);
    await setDoc(ref, { schedule: updated });
    setSchedule(updated);
  }

  async function addMeeting() {
    const updated = [...schedule, {
      id: Date.now().toString(),
      day: parseInt(newDay),
      time: newTime,
      label: newLabel || `Field Service – ${DAY_NAMES[parseInt(newDay)]}`,
      active: true
    }];
    await saveSchedule(updated);
    setShowAdd(false);
    setNewLabel('');
    setNewTime('07:00');
    setNewDay('0');
  }

  async function removeMeeting(id) {
    await saveSchedule(schedule.filter(s => s.id !== id));
  }

  async function toggleActive(id) {
    await saveSchedule(schedule.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  const upcoming = schedule
    .filter(s => s.active)
    .map(s => ({ ...s, nextDate: getNextOccurrence(s.day, s.time) }))
    .sort((a, b) => a.nextDate - b.nextDate);

  const nextMeeting = upcoming[0];

  return (
    <div className="flex flex-col h-full px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Field Meetings</h1>
          <p className="text-white/50 text-sm">Your preaching schedule</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Next meeting banner */}
      {nextMeeting && (
        <div className="bg-teal-500/20 border border-teal-400/30 rounded-2xl p-4 mb-4">
          <p className="text-teal-300/70 text-xs font-semibold uppercase tracking-widest mb-1">Next Field Service</p>
          <p className="text-white font-bold text-lg">{nextMeeting.label}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-teal-200 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{getCountdownLabel(nextMeeting.nextDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-teal-200 text-sm">
              <Clock className="w-4 h-4" />
              <span>{format(nextMeeting.nextDate, 'h:mm a')}</span>
            </div>
          </div>
          {isToday(nextMeeting.nextDate) && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-medium">It's today — prepare your material!</span>
            </div>
          )}
        </div>
      )}

      {/* Schedule list */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-safe">
        {schedule.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No meetings scheduled</p>
            <p className="text-white/25 text-xs mt-1">Add your regular field service days</p>
          </div>
        ) : (
          schedule
            .map(s => ({ ...s, nextDate: getNextOccurrence(s.day, s.time) }))
            .sort((a, b) => a.day - b.day)
            .map(meeting => {
              const countdown = getCountdownLabel(meeting.nextDate);
              const isUrgent = isToday(meeting.nextDate) || isTomorrow(meeting.nextDate);
              return (
                <div key={meeting.id} className={`card ${!meeting.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-teal-300 font-bold text-xs">{DAY_SHORT[meeting.day]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{meeting.label}</p>
                        <p className="text-white/50 text-sm">{DAY_NAMES[meeting.day]} at {
                          format(new Date(`2000-01-01T${meeting.time}`), 'h:mm a')
                        }</p>
                        {meeting.active && (
                          <p className={`text-xs mt-1 font-medium ${isUrgent ? 'text-yellow-300' : 'text-white/30'}`}>
                            Next: {countdown}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(meeting.id)}
                        className={`p-2 rounded-lg transition-colors ${meeting.active ? 'text-teal-400 hover:text-teal-300' : 'text-white/20 hover:text-white/40'}`}
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeMeeting(meeting.id)}
                        className="p-2 rounded-lg text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Upcoming week summary */}
      {upcoming.length > 0 && (
        <div className="mt-3 mb-2">
          <p className="section-title">Upcoming This Week</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {upcoming.slice(0, 5).map(m => (
              <div key={m.id} className="flex-shrink-0 bg-white/5 rounded-xl p-3 text-center min-w-[80px]">
                <p className="text-white/60 text-xs">{DAY_SHORT[m.day]}</p>
                <p className="text-white font-semibold text-sm">{format(m.nextDate, 'h a')}</p>
                {(isToday(m.nextDate) || isTomorrow(m.nextDate)) && (
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mx-auto mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-teal-900 border border-white/10 rounded-t-3xl w-full max-w-lg p-6 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Add Field Service Day</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-2 block">Day of Week</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_SHORT.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setNewDay(String(i))}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        parseInt(newDay) === i
                          ? 'bg-teal-500 text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Label (optional)</label>
                <input
                  className="input-field"
                  placeholder={`Field Service – ${DAY_NAMES[parseInt(newDay)]}`}
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={addMeeting} className="btn-primary flex-1">
                <Check className="w-4 h-4" /> Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
