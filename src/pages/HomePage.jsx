import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  Clock, MapPin, Calendar, BookOpen, TrendingUp,
  Bell, ChevronRight, Sunrise
} from 'lucide-react';
import { getNextOccurrence, minutesToHM } from '../utils/dateHelpers';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HomePage({ setTab }) {
  const { currentUser, userProfile } = useAuth();
  const [monthHours, setMonthHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [overdueVisits, setOverdueVisits] = useState([]);

  const uid = currentUser?.uid;
  const monthKey = format(new Date(), 'yyyy-MM');
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const name = userProfile?.firstName || userProfile?.name || currentUser?.email?.split('@')[0] || 'Friend';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Hours listener
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'hours', uid, 'months', monthKey);
    return onSnapshot(ref, snap => {
      if (!snap.exists()) { setMonthHours(0); setTodayHours(0); return; }
      const data = snap.data();
      const total = Object.values(data).flat().reduce((s, e) => s + (e.minutes || 0), 0);
      const today = (data[todayKey] || []).reduce((s, e) => s + (e.minutes || 0), 0);
      setMonthHours(total);
      setTodayHours(today);
    });
  }, [uid, monthKey]);

  // Visits listener
  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, 'returnVisits', uid, 'visits');
    return onSnapshot(ref, snap => {
      const visits = snap.docs.map(d => d.data());
      setVisitCount(visits.length);
      const overdue = visits.filter(v => {
        if (!v.reminderDate) return false;
        const rd = new Date(v.reminderDate);
        return rd <= new Date() || isToday(rd) || isTomorrow(rd);
      });
      setOverdueVisits(overdue);
    });
  }, [uid]);

  // Meetings listener
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'meetings', uid);
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const schedule = snap.data().schedule || [];
      const upcoming = schedule
        .filter(s => s.active)
        .map(s => ({ ...s, nextDate: getNextOccurrence(s.day, s.time) }))
        .sort((a, b) => a.nextDate - b.nextDate);
      setNextMeeting(upcoming[0] || null);
    });
  }, [uid]);

  return (
    <div className="flex flex-col h-full px-4 pt-4 overflow-y-auto pb-safe">
      {/* Greeting */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sunrise className="w-4 h-4 text-yellow-400" />
          <p className="text-white/50 text-sm">{greeting}</p>
        </div>
        <h1 className="text-2xl font-bold text-white">{name}</h1>
        <p className="text-white/40 text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Next meeting banner */}
      {nextMeeting && (isToday(nextMeeting.nextDate) || isTomorrow(nextMeeting.nextDate)) && (
        <div
          onClick={() => setTab('meetings')}
          className="bg-yellow-500/15 border border-yellow-400/30 rounded-2xl p-4 mb-4 cursor-pointer hover:bg-yellow-500/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <div>
                <p className="text-yellow-200 font-semibold text-sm">{nextMeeting.label}</p>
                <p className="text-yellow-300/70 text-xs">
                  {isToday(nextMeeting.nextDate) ? 'Today' : 'Tomorrow'} at {format(nextMeeting.nextDate, 'h:mm a')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-yellow-400/50" />
          </div>
        </div>
      )}

      {/* Overdue return visits */}
      {overdueVisits.length > 0 && (
        <div
          onClick={() => setTab('visits')}
          className="bg-teal-500/10 border border-teal-400/20 rounded-2xl p-4 mb-4 cursor-pointer hover:bg-teal-500/15 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-300" />
              <p className="text-teal-200 text-sm">
                <strong>{overdueVisits.length}</strong> return visit{overdueVisits.length > 1 ? 's' : ''} due
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-teal-400/50" />
          </div>
        </div>
      )}

      {/* Hour goal progress */}
      {userProfile?.hourGoal > 0 && (() => {
        const goalMins   = userProfile.hourGoal * 60;
        const pct        = Math.min(100, Math.round((monthHours / goalMins) * 100));
        const doneHours  = Math.floor(monthHours / 60);
        const color      = pct >= 100 ? 'bg-green-400' : pct >= 60 ? 'bg-teal-400' : 'bg-blue-400';
        return (
          <div onClick={() => setTab('hours')}
            className="card mb-4 cursor-pointer hover:bg-white/15 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 text-sm font-medium">Monthly Goal</p>
              <p className="text-white font-bold text-sm">
                {doneHours}
                <span className="text-white/35 font-normal"> / {userProfile.hourGoal} hrs</span>
              </p>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${pct}%` }} />
            </div>
            <p className={`text-xs mt-1.5 font-medium
              ${pct >= 100 ? 'text-green-400' : 'text-white/35'}`}>
              {pct >= 100
                ? `🎉 Goal reached! ${pct}%`
                : `${pct}% complete · ${Math.max(0, userProfile.hourGoal - doneHours)} hrs to go`}
            </p>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          onClick={() => setTab('hours')}
          className="card cursor-pointer hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-teal-300" />
            <p className="text-white/50 text-xs">This Month</p>
          </div>
          <p className="text-2xl font-bold text-white">{minutesToHM(monthHours)}</p>
          <p className="text-white/30 text-xs mt-0.5">{format(new Date(), 'MMMM')}</p>
        </div>

        <div
          onClick={() => setTab('hours')}
          className="card cursor-pointer hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-300" />
            <p className="text-white/50 text-xs">Today</p>
          </div>
          <p className="text-2xl font-bold text-white">{todayHours > 0 ? minutesToHM(todayHours) : '—'}</p>
          <p className="text-white/30 text-xs mt-0.5">
            {format(new Date(), 'd MMM')}
          </p>
        </div>

        <div
          onClick={() => setTab('visits')}
          className="card cursor-pointer hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-teal-300" />
            <p className="text-white/50 text-xs">Return Visits</p>
          </div>
          <p className="text-2xl font-bold text-white">{visitCount}</p>
          <p className="text-white/30 text-xs mt-0.5">Total contacts</p>
        </div>

        <div
          onClick={() => setTab('meetings')}
          className="card cursor-pointer hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-teal-300" />
            <p className="text-white/50 text-xs">Next Meeting</p>
          </div>
          <p className="text-lg font-bold text-white">
            {nextMeeting ? DAY_SHORT[nextMeeting.day] : '—'}
          </p>
          <p className="text-white/30 text-xs mt-0.5">
            {nextMeeting ? format(nextMeeting.nextDate, 'h:mm a') : 'No schedule'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <p className="section-title">Quick Actions</p>
      <div className="space-y-2">
        <button
          onClick={() => setTab('hours')}
          className="card w-full flex items-center justify-between hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-teal-300" />
            </div>
            <span className="text-white font-medium">Log today's hours</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>

        <button
          onClick={() => setTab('visits')}
          className="card w-full flex items-center justify-between hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-teal-300" />
            </div>
            <span className="text-white font-medium">Add a return visit</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>

        <button
          onClick={() => setTab('territory')}
          className="card w-full flex items-center justify-between hover:bg-white/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-teal-300" />
            </div>
            <span className="text-white font-medium">View territory maps</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
      </div>
    </div>
  );
}
