import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, User, Plus, Trash2, Share2, 
  AlertTriangle, RefreshCw, X, Save, CheckCircle, 
  LayoutGrid, Smartphone, ChevronRight, Copy, Check, Settings, Download
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';

// Firebase Initialization
let app, auth, db;
let initError = '';

// Accepts strict JSON, or the JS object snippet copied from the Firebase console
// (unquoted keys, trailing commas, "const firebaseConfig = {...};").
const parseFirebaseConfig = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (e) {
    const cleaned = raw
      .trim()
      .replace(/^(const|let|var)\s+\w+\s*=\s*/, '')
      .replace(/;\s*$/, '')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/,\s*}/g, '}');
    return JSON.parse(cleaned);
  }
};

const injectedApiKey = typeof __FIREBASE_API_KEY__ !== 'undefined' ? __FIREBASE_API_KEY__ : '';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: injectedApiKey,
  authDomain: "new-table-79dd1.firebaseapp.com",
  projectId: "new-table-79dd1",
  storageBucket: "new-table-79dd1.firebasestorage.app",
  messagingSenderId: "8445954767",
  appId: "1:8445954767:web:89a12d0ec0b1bbcc5e85ba"
};

// The apiKey can be supplied as the placeholder "process.env.apiKey"; resolve it from the `apiKey` env var at build time.
const resolveApiKey = (config) => {
  if (!config) return config;
  const key = config.apiKey;
  if (!key || /process\.env/.test(key)) {
    return { ...config, apiKey: injectedApiKey };
  }
  return config;
};

try {
  let firebaseConfig = null;
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = parseFirebaseConfig(__firebase_config);
  } else if (env.VITE_FIREBASE_CONFIG) {
    firebaseConfig = parseFirebaseConfig(env.VITE_FIREBASE_CONFIG);
  } else if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID
    };
  } else {
    firebaseConfig = DEFAULT_FIREBASE_CONFIG;
  }

  firebaseConfig = resolveApiKey(firebaseConfig);

  if (firebaseConfig && !firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Set the "apiKey" environment variable in Vercel and redeploy.');
  }

  if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  initError = e.message || String(e);
  console.error("Firebase initialization failed:", e);
}

const SYNC_UI = {
  connecting: { dot: 'bg-amber-500', label: 'Connecting' },
  connected: { dot: 'bg-emerald-500', label: 'Live' },
  'no-config': { dot: 'bg-slate-400', label: 'Local only' },
  'config-error': { dot: 'bg-rose-500', label: 'Config error' },
  'auth-error': { dot: 'bg-rose-500', label: 'Sign-in failed' },
  'db-error': { dot: 'bg-rose-500', label: 'Sync error' }
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'school-timetable-app';

const COLOR_OPTIONS = [
  { id: 'indigo', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700' },
  { id: 'emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700' },
  { id: 'blue', bg: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700' },
  { id: 'amber', bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700' },
  { id: 'rose', bg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700' },
  { id: 'purple', bg: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700' },
  { id: 'teal', bg: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-700' }
];

const DEFAULT_CLASSES = ['S1A', 'S1B', 'S1C', 'S1D', 'S1E'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_PERIODS = [
  { id: 1, name: 'P1' },
  { id: 2, name: 'P2' },
  { id: 3, name: 'P3' },
  { id: 4, name: 'P4' },
  { id: 5, name: 'P5' },
  { id: 6, name: 'P6' },
  { id: 7, name: 'P7' }
];

const PERMANENT_TEACHERS = [
  'SHM', 'MKP', 'SD', 'BJS', 'RV', 'KAK', 'TJN', 'JMK', 'PVR', 'FK',
  'TKM', 'PS', 'ASK', 'PKM', 'SK', 'KTA', 'RO', 'PTH', 'AVN', 'TMS',
  'SAK', 'MVH', 'SSB', 'SBN', 'MP', 'CS', 'MVS', 'SB', 'ATS', 'NMK',
  'SKR', 'MNR', 'ANS', 'KN', 'MTS', 'MS', 'RML', 'SP', 'MFS', 'BBK', 'CVS'
];

const TEMPORARY_TEACHERS = [
  'FAR', 'AKC', 'HAF', 'SMS', 'SUJ', 'SSN', 'PKF', 'AMC', 'SFR', 'SHN', 'AFM', 'HB'
];

const DEFAULT_TEACHERS = [...PERMANENT_TEACHERS, ...TEMPORARY_TEACHERS];

const INITIAL_SCHEDULE = {
  'Monday-S1A-1': { teacher: 'BBK', color: 'emerald' },
  'Monday-S1A-2': { teacher: 'BBK', color: 'emerald' },
  'Monday-S1A-3': { teacher: 'PKF', color: 'blue' },
  'Monday-S1A-4': { teacher: 'PKF', color: 'blue' },
  'Monday-S1A-5': { teacher: 'SMS', color: 'amber' },
  'Monday-S1A-6': { teacher: 'SMS', color: 'amber' },

  'Monday-S1B-1': { teacher: 'PS', color: 'purple' },
  'Monday-S1B-2': { teacher: 'PS', color: 'purple' },
  'Monday-S1B-3': { teacher: 'SMS', color: 'amber' },
  'Monday-S1B-4': { teacher: 'SMS', color: 'amber' },

  'Monday-S1C-1': { teacher: 'HB', color: 'rose' },
  'Monday-S1C-2': { teacher: 'HB', color: 'rose' },
  'Monday-S1C-3': { teacher: 'BBK', color: 'emerald' },
  'Monday-S1C-4': { teacher: 'CVS', color: 'indigo' },

  'Monday-S1D-1': { teacher: 'PKF', color: 'blue' },
  'Monday-S1D-2': { teacher: 'PKF', color: 'blue' },
  'Monday-S1D-3': { teacher: 'PS', color: 'purple' },
  'Monday-S1D-7': { teacher: 'AFM', color: 'teal' },

  'Monday-S1E-1': { teacher: 'FAR', color: 'teal' },
  'Monday-S1E-3': { teacher: 'AFM', color: 'teal' },
  'Monday-S1E-4': { teacher: 'AFM', color: 'teal' },
  'Monday-S1E-6': { teacher: 'HB', color: 'rose' }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [teacherPresets, setTeacherPresets] = useState(DEFAULT_TEACHERS);
  
  const [viewMode, setViewMode] = useState('grid'); 
  const [selectedMobileClass, setSelectedMobileClass] = useState(DEFAULT_CLASSES[0]);

  const [editingCell, setEditingCell] = useState(null);
  const [cellForm, setCellForm] = useState({ teacher: '', color: 'indigo' });
  const [teacherSearch, setTeacherSearch] = useState('');
  
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [toast, setToast] = useState(null);
  const [syncState, setSyncState] = useState(
    initError ? 'config-error' : db ? 'connecting' : 'no-config'
  );
  const [syncError, setSyncError] = useState(initError);

  const handleDownloadPDF = () => {
    window.print();
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!auth) {
      setIsSyncing(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auth failed:", e);
          setSyncState('auth-error');
          setSyncError(e.code || e.message || String(e));
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => setUser(usr));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setIsSyncing(false);
      return;
    }

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'timetables', 'school_schedule');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsSyncing(false);
      setSyncState('connected');
      setSyncError('');
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.classes) setClasses(data.classes);
        if (data.periods) setPeriods(data.periods);
        if (data.schedule) setSchedule(data.schedule || {});
        if (data.teacherPresets) setTeacherPresets(data.teacherPresets);
      } else {
        setDoc(docRef, {
          classes: DEFAULT_CLASSES,
          periods: DEFAULT_PERIODS,
          schedule: INITIAL_SCHEDULE,
          teacherPresets: DEFAULT_TEACHERS
        }).catch(err => console.error("Error setting initial doc:", err));
      }
    }, (err) => {
      console.error("Firestore error:", err);
      setIsSyncing(false);
      setSyncState('db-error');
      setSyncError(err.code || err.message || String(err));
    });

    return () => unsubscribe();
  }, [user]);

  const saveToFirebase = async (updatedData) => {
    if (!db || !user) {
      showToast("Saved on this device only (not connected)", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'timetables', 'school_schedule');
      // mergeFields replaces each listed field entirely. A plain { merge: true }
      // deep-merges maps, so a cleared cell would never be removed in Firestore.
      await setDoc(docRef, updatedData, { mergeFields: Object.keys(updatedData) });
      showToast("Synced to cloud", "success");
    } catch (err) {
      console.error("Error saving:", err);
      showToast(`Sync failed: ${err.code || err.message}`, "warning");
    } finally {
      setIsSaving(false);
    }
  };

  const teacherConflicts = useMemo(() => {
    const conflicts = {};
    periods.forEach(p => {
      const teacherToClasses = {};
      classes.forEach(c => {
        const key = `${selectedDay}-${c}-${p.id}`;
        const cell = schedule[key];
        if (cell && cell.teacher && cell.teacher.trim() !== '') {
          const code = cell.teacher.trim().toUpperCase();
          if (!teacherToClasses[code]) teacherToClasses[code] = [];
          teacherToClasses[code].push(c);
        }
      });

      Object.entries(teacherToClasses).forEach(([tCode, classList]) => {
        if (classList.length > 1) {
          if (!conflicts[p.id]) conflicts[p.id] = {};
          conflicts[p.id][tCode] = classList;
        }
      });
    });
    return conflicts;
  }, [schedule, selectedDay, classes, periods]);

  const isConflict = (className, periodId) => {
    const key = `${selectedDay}-${className}-${periodId}`;
    const cell = schedule[key];
    if (!cell || !cell.teacher) return false;
    const code = cell.teacher.trim().toUpperCase();
    return Boolean(teacherConflicts[periodId] && teacherConflicts[periodId][code]);
  };

  const getColorClasses = (colorId) => {
    const found = COLOR_OPTIONS.find(c => c.id === colorId);
    return found ? found.bg : COLOR_OPTIONS[0].bg;
  };

  const openCellModal = (className, periodId) => {
    const key = `${selectedDay}-${className}-${periodId}`;
    const cell = schedule[key] || { teacher: '', color: 'indigo' };
    setEditingCell({ className, periodId });
    setCellForm({
      teacher: cell.teacher || '',
      color: cell.color || 'indigo'
    });
    setTeacherSearch('');
  };

  const saveCell = () => {
    if (!editingCell) return;
    const { className, periodId } = editingCell;
    const key = `${selectedDay}-${className}-${periodId}`;
    
    let newPresets = [...teacherPresets];
    const upperTeacher = cellForm.teacher.trim().toUpperCase();
    if (upperTeacher && !newPresets.includes(upperTeacher)) {
      newPresets.push(upperTeacher);
      setTeacherPresets(newPresets);
    }

    const updatedSchedule = { ...schedule };
    if (upperTeacher) {
      updatedSchedule[key] = {
        teacher: upperTeacher,
        color: cellForm.color
      };
    } else {
      delete updatedSchedule[key];
    }

    setSchedule(updatedSchedule);
    setEditingCell(null);

    saveToFirebase({
      schedule: updatedSchedule,
      teacherPresets: newPresets
    });
  };

  const clearCell = () => {
    if (!editingCell) return;
    const { className, periodId } = editingCell;
    const key = `${selectedDay}-${className}-${periodId}`;
    
    const updatedSchedule = { ...schedule };
    delete updatedSchedule[key];

    setSchedule(updatedSchedule);
    setEditingCell(null);

    saveToFirebase({ schedule: updatedSchedule });
  };

  const addClass = () => {
    const trimmed = newClassName.trim().toUpperCase();
    if (!trimmed) return;
    if (classes.includes(trimmed)) {
      showToast(`Class ${trimmed} already exists`, 'warning');
      return;
    }
    const updated = [...classes, trimmed];
    setClasses(updated);
    setNewClassName('');
    saveToFirebase({ classes: updated });
    showToast(`Class ${trimmed} added`, 'success');
  };

  const removeClass = (clsName) => {
    if (classes.length <= 1) {
      showToast("Minimum 1 class required", "warning");
      return;
    }
    const updated = classes.filter(c => c !== clsName);
    setClasses(updated);
    if (selectedMobileClass === clsName) setSelectedMobileClass(updated[0]);
    saveToFirebase({ classes: updated });
  };

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teacherPresets;
    return teacherPresets.filter(t => t.toLowerCase().includes(teacherSearch.toLowerCase()));
  }, [teacherPresets, teacherSearch]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Keep the mobile class selection valid if classes change remotely
  const activeMobileClass = classes.includes(selectedMobileClass) ? selectedMobileClass : classes[0];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-16">
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, button, .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 16px;
          }
          .print-header h1 {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
          }
          .print-header p {
            font-size: 12px;
            color: #475569;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px !important;
            color: #0f172a !important;
            background-color: white !important;
          }
          .shadow-xs, .shadow-2xl, .shadow-xl {
            box-shadow: none !important;
          }
        }
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>

      {/* Printable Header */}
      <div className="print-header">
        <h1>School Timetable Matrix — {selectedDay}</h1>
        <p>Generated on {new Date().toLocaleDateString()} | Teacher Short Code Schedule</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce no-print">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                School Timetable Matrix
                {syncState === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${SYNC_UI[syncState].dot}`}></span>
                    {SYNC_UI[syncState].label}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Teacher Short Code Schedule
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadPDF}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-1 transition-all"
              title="Download or Print Timetable as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex items-center gap-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Matrix View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('mobile-cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'mobile-cards' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Mobile Cards View"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={() => setIsClassModalOpen(true)}
              className="p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl"
              title="Manage Classes"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day Selection Bar */}
        <div className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-3 py-1 flex space-x-1 overflow-x-auto scrollbar-none">
            {DAYS.map((day) => {
              const isActive = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 pt-3 space-y-3">
        {syncState !== 'connected' && syncState !== 'connecting' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-xs flex items-start gap-2 no-print">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-amber-900 dark:text-amber-200">
              {syncState === 'no-config' && "Live sync is off, so changes stay on this device only. Add VITE_FIREBASE_CONFIG in Vercel project settings, then redeploy."}
              {syncState === 'config-error' && `The Firebase config could not be read: ${syncError}`}
              {syncState === 'auth-error' && `Sign-in to Firebase failed (${syncError}). In Firebase Authentication, enable the Anonymous provider and add this site's domain under Authorized domains.`}
              {syncState === 'db-error' && `Firestore refused the connection (${syncError}). Check that a Firestore database exists and that your rules allow signed-in users to read and write.`}
            </div>
          </div>
        )}

        {Object.keys(teacherConflicts).length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 text-xs flex items-center gap-2 shadow-xs no-print">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-rose-900 dark:text-rose-200">Teacher Conflict Detected ({selectedDay}):</span>
              {Object.entries(teacherConflicts).map(([periodId, tMap]) => {
                const pObj = periods.find(p => p.id === Number(periodId));
                return Object.entries(tMap).map(([teacher, clsList]) => (
                  <span key={`${periodId}-${teacher}`} className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-bold text-[11px] border border-rose-300 dark:border-rose-700">
                    {teacher} in {clsList.join(' & ')} ({pObj?.name || `P${periodId}`})
                  </span>
                ));
              })}
            </div>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-indigo-600" />
                <span>{selectedDay} Period Matrix</span>
              </h3>
              <span className="text-[11px] text-slate-400 no-print">
                Click cell to assign teacher code
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    <th className="px-3 py-2 font-bold w-20">Class</th>
                    {periods.map(p => (
                      <th key={p.id} className="px-2 py-2 font-bold text-center">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c} className="border-b border-slate-100 dark:border-slate-700/60">
                      <td className="px-3 py-2 font-bold text-xs text-slate-700 dark:text-slate-200">{c}</td>
                      {periods.map(p => {
                        const key = `${selectedDay}-${c}-${p.id}`;
                        const cell = schedule[key];
                        const conflict = isConflict(c, p.id);
                        return (
                          <td key={p.id} className="p-1 text-center">
                            <button
                              onClick={() => openCellModal(c, p.id)}
                              className={`w-full min-h-[34px] px-1 py-1 rounded-lg border text-xs font-bold transition-all ${
                                cell && cell.teacher
                                  ? getColorClasses(cell.color)
                                  : 'border-dashed border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                              } ${conflict ? 'ring-2 ring-rose-500' : ''}`}
                            >
                              {cell && cell.teacher ? cell.teacher : '+'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'mobile-cards' && (
          <div className="space-y-3 no-print">
            <div className="flex space-x-1 overflow-x-auto pb-1">
              {classes.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedMobileClass(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeMobileClass === c
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
              {periods.map(p => {
                const key = `${selectedDay}-${activeMobileClass}-${p.id}`;
                const cell = schedule[key];
                const conflict = isConflict(activeMobileClass, p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => openCellModal(activeMobileClass, p.id)}
                    className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-xs font-bold text-slate-500 dark:text-slate-400">{p.name}</span>
                      {cell && cell.teacher ? (
                        <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getColorClasses(cell.color)} ${conflict ? 'ring-2 ring-rose-500' : ''}`}>
                          {cell.teacher}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not assigned</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Assign teacher</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDay} · {editingCell.className} · {periods.find(p => p.id === editingCell.periodId)?.name || `P${editingCell.periodId}`}
                </p>
              </div>
              <button onClick={() => setEditingCell(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5" /> Teacher code
                </label>
                <input
                  type="text"
                  value={cellForm.teacher}
                  onChange={(e) => setCellForm({ ...cellForm, teacher: e.target.value.toUpperCase() })}
                  placeholder="e.g. BBK"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search saved teachers"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredTeachers.map(t => (
                    <button
                      key={t}
                      onClick={() => setCellForm({ ...cellForm, teacher: t })}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                        cellForm.teacher === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Colour</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCellForm({ ...cellForm, color: opt.id })}
                      className={`px-3 py-1 rounded-lg border text-[11px] font-bold capitalize ${opt.bg} ${
                        cellForm.color === opt.id ? 'ring-2 ring-offset-1 ring-slate-800 dark:ring-white' : ''
                      }`}
                    >
                      {opt.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <button
                onClick={clearCell}
                className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={saveCell}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Classes Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm">Manage classes</h3>
              <button onClick={() => setIsClassModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addClass(); }}
                  placeholder="New class, e.g. S2A"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={addClass}
                  className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-100 dark:border-slate-700 rounded-xl">
                {classes.map(c => (
                  <li key={c} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-bold">{c}</span>
                    <button
                      onClick={() => removeClass(c)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      title={`Remove ${c}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm">Share timetable</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Anyone with this link sees the same live timetable and can edit it.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
                <button
                  onClick={copyShareLink}
                  className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
