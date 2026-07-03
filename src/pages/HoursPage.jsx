import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs
} from 'firebase/firestore';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isSameDay, parseISO, subDays
} from 'date-fns';
import {
  Clock, Plus, ChevronLeft, ChevronRight, Trash2,
  Calendar, Timer, CheckCircle, Edit3
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { minutesToHM } from '../utils/dateHelpers';

const QUICK_ADDS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hr', minutes: 60 },
  { label: '1.5 hr', minutes: 90 },
  { label: '2 hr', minutes: 120 },
];

function minutesToDecimal(mins) {
  return (mins / 60).toFixed(1);
}

export default function HoursPage() {
  const { currentUser, userProfile } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [addMode, setAddMode] = useState('quick'); // 'quick' | 'range' | 'manual'
  const [manualMinutes, setManualMinutes] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [reportData, setReportData] = useState({ bibleStudies: '', comments: '' });
  const [loading, setLoading] = useState(false);

  const monthKey = format(viewDate, 'yyyy-MM');
  const uid = currentUser?.uid;

  // Real-time listener for month data
  useEffect(() => {
    if (!uid) return;
    const monthRef = doc(db, 'hours', uid, 'months', monthKey);
    const unsub = onSnapshot(monthRef, (snap) => {
      if (snap.exists()) {
        setMonthData(snap.data());
      } else {
        setMonthData({});
      }
    });
    return unsub;
  }, [uid, monthKey]);

  function getDayEntries(date) {
    const key = format(date, 'yyyy-MM-dd');
    return monthData[key] || [];
  }

  function getDayMinutes(date) {
    return getDayEntries(date).reduce((sum, e) => sum + (e.minutes || 0), 0);
  }

  function getMonthTotalMinutes() {
    return Object.values(monthData).flat().reduce((sum, e) => sum + (e.minutes || 0), 0);
  }

  async function addEntry(minutes, label) {
    if (!minutes || minutes <= 0) return;
    setLoading(true);
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const monthRef = doc(db, 'hours', uid, 'months', monthKey);
    const existing = monthData[dateKey] || [];
    const newEntry = {
      id: Date.now().toString(),
      minutes,
      label,
      addedAt: new Date().toISOString()
    };
    await setDoc(monthRef, {
      ...monthData,
      [dateKey]: [...existing, newEntry]
    }, { merge: false });
    setLoading(false);
    setShowAddModal(false);
    setManualMinutes('');
    setRangeStart('');
    setRangeEnd('');
  }

  async function removeEntry(dateKey, entryId) {
    const monthRef = doc(db, 'hours', uid, 'months', monthKey);
    const existing = monthData[dateKey] || [];
    await setDoc(monthRef, {
      ...monthData,
      [dateKey]: existing.filter(e => e.id !== entryId)
    });
  }

  function handleQuickAdd(minutes) {
    addEntry(minutes, minutesToHM(minutes));
  }

  function handleRangeAdd() {
    if (!rangeStart || !rangeEnd) return;
    const [sh, sm] = rangeStart.split(':').map(Number);
    const [eh, em] = rangeEnd.split(':').map(Number);
    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins < startMins) endMins += 24 * 60; // overnight
    const diff = endMins - startMins;
    if (diff <= 0) return;
    addEntry(diff, `${rangeStart}–${rangeEnd}`);
  }

  function handleManualAdd() {
    const mins = parseInt(manualMinutes);
    if (!mins || mins <= 0) return;
    addEntry(mins, `${mins} min`);
  }

  async function generateReport() {
    const totalMins = getMonthTotalMinutes();
    const totalHours = Math.round(totalMins / 60 * 10) / 10;
    const reportRef = doc(db, 'reports', uid, 'months', monthKey);
    await setDoc(reportRef, {
      name: userProfile?.name || userProfile?.firstName || currentUser?.email?.split('@')[0] || 'Publisher',
      month: format(viewDate, 'MMMM yyyy'),
      monthKey,
      totalHours,
      totalMinutes: totalMins,
      bibleStudies: parseInt(reportData.bibleStudies) || 0,
      participated: totalMins > 0,
      comments: reportData.comments || '',
      generatedAt: new Date().toISOString()
    });
    setShowReportModal(false);
  }

  // Calendar days
  const days = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate)
  });
  const firstDayOfWeek = startOfMonth(viewDate).getDay();

  const selectedEntries = getDayEntries(selectedDate);
  const selectedMins = getDayMinutes(selectedDate);
  const monthTotal = getMonthTotalMinutes();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Hours</h1>
            <p className="text-white/50 text-sm">Track your field service time</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-teal-300">{minutesToHM(monthTotal)}</p>
            <p className="text-white/40 text-xs">{format(viewDate, 'MMMM yyyy')}</p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-white">{format(viewDate, 'MMMM yyyy')}</span>
          <button
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-white/30 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const mins = getDayMinutes(day);
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all
                  ${isSelected ? 'bg-teal-500 text-white' : today ? 'bg-teal-500/20 text-teal-300' : 'text-white/70 hover:bg-white/10'}
                `}
              >
                <span>{format(day, 'd')}</span>
                {mins > 0 && (
                  <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-teal-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-white">{format(selectedDate, 'EEEE, d MMMM')}</p>
            <p className="text-teal-300 text-sm">{selectedMins > 0 ? minutesToHM(selectedMins) : 'No hours logged'}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-4 text-sm"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {selectedEntries.length === 0 ? (
          <div className="card text-center py-8">
            <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No time logged for this day</p>
            <p className="text-white/25 text-xs mt-1">Tap Add to record service time</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEntries.map(entry => (
              <div key={entry.id} className="card flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                    <Timer className="w-4 h-4 text-teal-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{minutesToHM(entry.minutes)}</p>
                    <p className="text-white/40 text-xs">{entry.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(format(selectedDate, 'yyyy-MM-dd'), entry.id)}
                  className="p-2 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Month summary + report button */}
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-white">Month Summary</p>
            <span className="text-teal-300 font-bold">{minutesToHM(monthTotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <p className="text-white/40 text-xs">Days Active</p>
              <p className="text-white font-semibold">
                {Object.values(monthData).filter(entries => entries.reduce((s, e) => s + e.minutes, 0) > 0).length}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <p className="text-white/40 text-xs">Decimal Hours</p>
              <p className="text-white font-semibold">{minutesToDecimal(monthTotal)}</p>
            </div>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-primary w-full text-sm"
          >
            <CheckCircle className="w-4 h-4" /> Generate S-4 Report
          </button>
        </div>
      </div>

      {/* Add Time Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-teal-900 border border-white/10 rounded-t-3xl w-full max-w-lg p-6 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Add Time</h3>
              <p className="text-white/50 text-sm">{format(selectedDate, 'd MMM')}</p>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
              {[['quick', 'Quick'], ['range', 'Time Range'], ['manual', 'Manual']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    addMode === mode ? 'bg-teal-500 text-white' : 'text-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {addMode === 'quick' && (
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ADDS.map(({ label, minutes }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickAdd(minutes)}
                    disabled={loading}
                    className="btn-secondary py-4 text-lg font-bold flex-col gap-0.5"
                  >
                    <span className="text-base font-bold">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {addMode === 'range' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">End Time</label>
                    <input
                      type="time"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                {rangeStart && rangeEnd && (() => {
                  const [sh, sm] = rangeStart.split(':').map(Number);
                  const [eh, em] = rangeEnd.split(':').map(Number);
                  let diff = (eh * 60 + em) - (sh * 60 + sm);
                  if (diff < 0) diff += 1440;
                  return diff > 0 ? (
                    <p className="text-teal-300 text-sm text-center">= {minutesToHM(diff)}</p>
                  ) : null;
                })()}
                <button onClick={handleRangeAdd} disabled={!rangeStart || !rangeEnd || loading} className="btn-primary w-full">
                  Add {rangeStart && rangeEnd ? (() => {
                    const [sh, sm] = rangeStart.split(':').map(Number);
                    const [eh, em] = rangeEnd.split(':').map(Number);
                    let diff = (eh * 60 + em) - (sh * 60 + sm);
                    if (diff < 0) diff += 1440;
                    return minutesToHM(diff);
                  })() : 'Time'}
                </button>
              </div>
            )}

            {addMode === 'manual' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Minutes to add</label>
                  <input
                    type="number"
                    value={manualMinutes}
                    onChange={e => setManualMinutes(e.target.value)}
                    placeholder="e.g. 45"
                    min="1"
                    max="1440"
                    className="input-field text-xl font-bold"
                  />
                </div>
                {manualMinutes > 0 && (
                  <p className="text-teal-300 text-sm text-center">= {minutesToHM(parseInt(manualMinutes))}</p>
                )}
                <button onClick={handleManualAdd} disabled={!manualMinutes || loading} className="btn-primary w-full">
                  Add {manualMinutes ? minutesToHM(parseInt(manualMinutes)) : 'Time'}
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(false)}
              className="btn-secondary w-full mt-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          viewDate={viewDate}
          monthTotal={monthTotal}
          userProfile={userProfile}
          currentUser={currentUser}
          reportData={reportData}
          setReportData={setReportData}
          onGenerate={generateReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

function ReportModal({ viewDate, monthTotal, userProfile, currentUser, reportData, setReportData, onGenerate, onClose }) {
  const name = userProfile?.name || userProfile?.firstName || currentUser?.email?.split('@')[0] || 'Publisher';
  const totalHours = Math.round(monthTotal / 60 * 10) / 10;
  const [exporting, setExporting] = useState(false);

  async function handleExportPDF() {
    setExporting(true);
    const el = document.getElementById('report-card');
    if (!el) { setExporting(false); return; }
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save(`S4-Report-${name}-${format(viewDate, 'MMMM-yyyy')}.pdf`);
    setExporting(false);
    await onGenerate();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-teal-900 border border-white/10 rounded-2xl w-full max-w-sm p-5">
        <h3 className="font-bold text-white text-lg mb-4">Field Service Report</h3>

        {/* Preview card — matches S-4 format */}
        <div id="report-card" className="bg-white rounded-xl p-5 mb-4 text-gray-900">
          <h2 className="text-center font-bold text-lg mb-4 tracking-wide">FIELD SERVICE REPORT</h2>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex gap-2">
              <span className="font-medium w-16">Name:</span>
              <span className="font-bold">{name.toUpperCase()}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium w-16">Month:</span>
              <span className="font-bold">{format(viewDate, 'MMMM yyyy')}</span>
            </div>
          </div>
          <div className="border border-gray-300 rounded text-sm">
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <span className="text-xs">Shared in ministry this month</span>
              <span className="text-xl font-bold">{monthTotal > 0 ? '✓' : '☐'}</span>
            </div>
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <span className="text-xs">Number of <em>different</em> Bible studies conducted</span>
              <span className="text-2xl font-bold w-12 text-right">{reportData.bibleStudies || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <span className="text-xs">Hours (if auxiliary, regular, or special pioneer or field missionary)</span>
              <span className="text-3xl font-bold w-16 text-right">{totalHours}</span>
            </div>
            <div className="p-2">
              <span className="text-xs text-gray-500">Comments:</span>
              <p className="text-xs mt-1 min-h-[40px]">{reportData.comments}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">S-4-E 11/23</p>
        </div>

        {/* Editable fields */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Bible Studies Conducted</label>
            <input
              type="number"
              min="0"
              value={reportData.bibleStudies}
              onChange={e => setReportData(r => ({ ...r, bibleStudies: e.target.value }))}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Comments (optional)</label>
            <textarea
              value={reportData.comments}
              onChange={e => setReportData(r => ({ ...r, comments: e.target.value }))}
              className="input-field resize-none"
              rows={2}
              placeholder="Any notes..."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn-primary flex-1">
            {exporting ? 'Exporting...' : 'Save & Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
