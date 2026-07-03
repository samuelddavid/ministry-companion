import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import {
  MapPin, Trash2, Navigation, Map, ChevronRight,
  X, Plus, QrCode, FileText, Loader2, CheckCircle, Upload
} from 'lucide-react';

// ─── PDF extraction using pdf.js ──────────────────────────────────────────
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return window.pdfjsLib;
}

async function extractFromPDF(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
        const page = await pdf.getPage(1);

        // ── 1. Raw text ──────────────────────────────────────────────────
        const tc = await page.getTextContent();
        const rawText = tc.items.map(i => i.str).join('\n');
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

        console.log('PDF lines:', lines);

        // ── 2. Parse fields using the known layout of territory PDFs ─────
        // Line 0: "Bhopal Territory Map #21"
        // Line 1: "Arera Colony"
        // Line 2: "Boundaries: ..."
        // Line 3: "Landmarks: ..."
        // Line 4+: "Notes: ..."

        const titleLine = lines[0] || '';
        const numMatch = titleLine.match(/#(\d+)/);
        const number   = numMatch ? numMatch[1] : '';
        const name     = titleLine.trim();

        // Area = second line (before "Boundaries")
        const areaLineIdx = lines.findIndex(l => /^Boundar/i.test(l));
        const area = areaLineIdx > 1 ? lines[areaLineIdx - 1] : (lines[1] || '');

        // Boundaries: everything after "Boundaries: "
        const boundLine = lines.find(l => /^Boundar/i.test(l)) || '';
        const boundaries = boundLine.replace(/^Boundar(?:y|ies)\s*:\s*/i, '').trim();

        // Landmarks: everything after "Landmarks: "
        const landLine = lines.find(l => /^Landmark/i.test(l)) || '';
        const landmarks = landLine.replace(/^Landmarks?\s*:\s*/i, '').trim();

        // Notes: everything after "Notes: "
        const notesLine = lines.find(l => /^Notes?\s*:/i.test(l)) || '';
        const notes = notesLine.replace(/^Notes?\s*:\s*/i, '').trim();

        // ── 3. Google Maps link from PDF annotations ──────────────────────
        let mapsLink = '';
        try {
          const annotations = await page.getAnnotations();
          for (const ann of annotations) {
            const url = ann.url || ann.unsafeUrl || '';
            if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) {
              mapsLink = url;
              break;
            }
          }
        } catch (_) {}

        console.log('Extracted:', { number, name, area, boundaries, landmarks, notes, mapsLink });
        resolve({ number, name, area, boundaries, landmarks, notes, mapsLink });
      } catch (err) {
        console.error('PDF parse error:', err);
        resolve(null);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Main component ────────────────────────────────────────────────────────
export default function TerritoryPage() {
  const { currentUser } = useAuth();
  const [territories, setTerritories] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [showAdd, setShowAdd]        = useState(false);
  const [pdfMode, setPdfMode]        = useState(true);
  const [parsing, setParsing]        = useState(false);
  const [parsed, setParsed]          = useState(false);
  const [saving, setSaving]          = useState(false);
  const [form, setForm] = useState({
    number: '', name: '', area: '', boundaries: '', landmarks: '', mapsLink: '', notes: ''
  });
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, 'territories', uid, 'list');
    return onSnapshot(colRef, snap =>
      setTerritories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [uid]);

  function resetModal() {
    setForm({ number: '', name: '', area: '', boundaries: '', landmarks: '', mapsLink: '', notes: '' });
    setParsed(false); setPdfMode(true); setShowAdd(false);
  }

  async function handlePDFUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true); setParsed(false);
    const extracted = await extractFromPDF(file);
    if (extracted) { setForm(extracted); setParsed(true); }
    setParsing(false);
    // reset input so same file can be re-uploaded
    e.target.value = '';
  }

  async function handleSave() {
    if (!form.number && !form.name) return;
    setSaving(true);
    await addDoc(collection(db, 'territories', uid, 'list'), {
      ...form, createdAt: new Date().toISOString()
    });
    resetModal(); setSaving(false);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, 'territories', uid, 'list', id));
    if (selected?.id === id) setSelected(null);
  }

  if (selected) {
    return <TerritoryMapView territory={selected} onBack={() => setSelected(null)} onDelete={handleDelete} />;
  }

  return (
    <div className="flex flex-col h-full px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Territories</h1>
          <p className="text-white/50 text-sm">{territories.length} area{territories.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Territory list */}
      {territories.length === 0 ? (
        <div className="card text-center py-14 mt-2">
          <Map className="w-10 h-10 text-green-400/30 mx-auto mb-3" />
          <p className="text-white/40 font-medium">No territories yet</p>
          <p className="text-white/25 text-xs mt-1">Tap Add and upload your territory PDF</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pb-4">
          {territories.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className="w-full text-left flex items-center justify-between p-4
                bg-green-500/8 hover:bg-green-500/15 border border-green-400/15
                rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-green-500/20 border border-green-400/20 rounded-xl
                  flex items-center justify-center flex-shrink-0">
                  <span className="text-green-300 font-bold text-sm">#{t.number || '?'}</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-white/50 text-sm">{t.area}</p>
                  {t.boundaries && (
                    <p className="text-white/30 text-xs mt-0.5 truncate max-w-[210px]">{t.boundaries}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {t.mapsLink && <div className="w-2 h-2 bg-green-400 rounded-full" title="Map link available" />}
                <ChevronRight className="w-4 h-4 text-white/25" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Add Territory Modal ─────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-teal-900 border border-white/10 rounded-t-3xl w-full max-w-lg
            p-6 pb-8 max-h-[92vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Add Territory</h3>
              <button onClick={resetModal} className="p-2 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
              {[
                [true, FileText, 'Upload PDF'],
                [false, MapPin, 'Enter Manually'],
              ].map(([mode, Icon, label]) => (
                <button key={label} onClick={() => setPdfMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                    flex items-center justify-center gap-2
                    ${pdfMode === mode
                      ? 'bg-green-500/25 text-green-200'
                      : 'text-white/40 hover:text-white/60'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {/* PDF upload zone */}
            {pdfMode && (
              <label className={`block w-full border-2 border-dashed rounded-2xl p-7 mb-5
                text-center cursor-pointer transition-all
                ${parsed
                  ? 'border-green-400/50 bg-green-500/10'
                  : 'border-white/20 hover:border-green-400/40 hover:bg-white/5'}`}>
                <input type="file" accept=".pdf" onChange={handlePDFUpload}
                  className="hidden" disabled={parsing} />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-9 h-9 text-green-400 animate-spin" />
                    <p className="text-white/60 text-sm font-medium">Reading PDF…</p>
                    <p className="text-white/30 text-xs">Extracting territory info</p>
                  </div>
                ) : parsed ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-9 h-9 text-green-400" />
                    <p className="text-green-300 font-semibold">Extracted successfully!</p>
                    <p className="text-white/35 text-xs">Tap to upload a different PDF</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-9 h-9 text-white/25" />
                    <p className="text-white/60 font-medium text-sm">Tap to upload territory PDF</p>
                    <p className="text-white/30 text-xs text-center">
                      Territory number, area, boundaries,<br />landmarks and map link auto-extracted
                    </p>
                  </div>
                )}
              </label>
            )}

            {/* Fields — shown after PDF parse OR in manual mode */}
            {(!pdfMode || parsed) && (
              <div className="space-y-3">
                {parsed && (
                  <div className="bg-green-500/10 border border-green-400/20 rounded-xl px-3 py-2
                    text-xs text-green-300 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Extracted from PDF — review and edit before saving
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Territory #</label>
                    <input className="input-field" placeholder="21" value={form.number}
                      onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Full Name</label>
                    <input className="input-field" placeholder="Bhopal Territory Map #21"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Area / Colony</label>
                  <input className="input-field" placeholder="Arera Colony" value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Boundaries</label>
                  <textarea className="input-field resize-none" rows={2} value={form.boundaries}
                    placeholder="2nd Main Rd – 3rd Main Rd, Bittan Square – Habibganj Road"
                    onChange={e => setForm(f => ({ ...f, boundaries: e.target.value }))} />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Landmarks</label>
                  <input className="input-field" placeholder="10 No Market" value={form.landmarks}
                    onChange={e => setForm(f => ({ ...f, landmarks: e.target.value }))} />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">
                    Google Maps Link
                    {form.mapsLink
                      ? <span className="ml-1 text-green-400">✓ extracted from PDF</span>
                      : <span className="ml-1 text-white/25">— from QR code in PDF</span>}
                  </label>
                  <input className="input-field text-xs" placeholder="https://maps.google.com/..."
                    value={form.mapsLink}
                    onChange={e => setForm(f => ({ ...f, mapsLink: e.target.value }))} />
                </div>

                {form.notes ? (
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Notes</label>
                    <input className="input-field" value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={resetModal} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave}
                disabled={saving || (!form.number && !form.name)}
                className="btn-primary flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : 'Save Territory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Territory map view ─────────────────────────────────────────────────────
function TerritoryMapView({ territory, onBack, onDelete }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locErr, setLocErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setLocErr('Location access denied'),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const mapEmbedUrl = territory.area
    ? `https://maps.google.com/maps?q=${encodeURIComponent(territory.area + ', Bhopal, India')}&output=embed&z=15`
    : null;

  function openMyMaps() {
    window.open(territory.mapsLink ||
      `https://www.google.com/maps/search/${encodeURIComponent(territory.area + ', Bhopal')}`, '_blank');
  }

  function navigate() {
    const dest = encodeURIComponent(territory.area + ', Bhopal, India');
    const base = userLocation
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/`
      : 'https://www.google.com/maps/dir//';
    window.open(base + dest, '_blank');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-white">Territory #{territory.number}</h2>
          <p className="text-white/50 text-sm">{territory.name}</p>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(territory.id)}
              className="text-xs bg-red-500/20 border border-red-400/30 text-red-300
                px-3 py-1.5 rounded-lg">Delete</button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-xs bg-white/10 text-white/50 px-3 py-1.5 rounded-lg">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="p-2 text-white/25 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3 overflow-y-auto flex-1 pb-4">
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/12 border border-green-400/20 rounded-2xl p-3">
            <p className="text-green-300/60 text-xs font-semibold uppercase tracking-wide mb-1">Territory</p>
            <p className="text-white font-bold text-lg">#{territory.number}</p>
          </div>
          <div className="bg-blue-500/12 border border-blue-400/20 rounded-2xl p-3">
            <p className="text-blue-300/60 text-xs font-semibold uppercase tracking-wide mb-1">Area</p>
            <p className="text-white font-semibold text-sm leading-tight">{territory.area || '—'}</p>
          </div>
        </div>

        {territory.boundaries && (
          <div className="bg-orange-500/10 border border-orange-400/20 rounded-2xl p-3">
            <p className="text-orange-300/60 text-xs font-semibold uppercase tracking-wide mb-1">Boundaries</p>
            <p className="text-white/85 text-sm">{territory.boundaries}</p>
          </div>
        )}

        {territory.landmarks && (
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-2xl p-3">
            <p className="text-purple-300/60 text-xs font-semibold uppercase tracking-wide mb-1">Landmarks</p>
            <p className="text-white/85 text-sm">{territory.landmarks}</p>
          </div>
        )}

        {/* GPS dot */}
        <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
            ${userLocation ? 'bg-green-400 animate-pulse' : 'bg-yellow-400/60'}`} />
          <p className="text-sm text-white/55">
            {userLocation
              ? `GPS: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`
              : locErr || 'Getting your location…'}
          </p>
        </div>

        {/* Embedded map */}
        {mapEmbedUrl && (
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
            <iframe src={mapEmbedUrl} width="100%" height="260"
              style={{ border: 0 }} allowFullScreen loading="lazy" title="Territory Map" />
          </div>
        )}

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button onClick={openMyMaps}
            className="btn-primary bg-green-600 hover:bg-green-500 active:bg-green-700 text-sm py-3">
            <QrCode className="w-4 h-4" />
            {territory.mapsLink ? 'Open My Maps' : 'Search Area'}
          </button>
          <button onClick={navigate} disabled={!userLocation}
            className="btn-secondary text-sm py-3">
            <Navigation className="w-4 h-4" /> Navigate
          </button>
        </div>
      </div>
    </div>
  );
}
