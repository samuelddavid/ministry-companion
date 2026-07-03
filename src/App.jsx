import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SetupProfile from './pages/SetupProfile';
import HomePage from './pages/HomePage';
import HoursPage from './pages/HoursPage';
import TerritoryPage from './pages/TerritoryPage';
import ReturnVisitsPage from './pages/ReturnVisitsPage';
import MeetingsPage from './pages/MeetingsPage';
import SettingsPage from './pages/SettingsPage';
import TopNav from './components/TopNav';
import { LogOut, Home, Clock, Map, MapPin, Calendar, Settings } from 'lucide-react';

const TABS = [
  { id: 'home',      label: 'Home',     Icon: Home,     color: 'text-teal-300'   },
  { id: 'hours',     label: 'Hours',    Icon: Clock,    color: 'text-blue-300'   },
  { id: 'territory', label: 'Territory',Icon: Map,      color: 'text-green-300'  },
  { id: 'visits',    label: 'Visits',   Icon: MapPin,   color: 'text-orange-300' },
  { id: 'meetings',  label: 'Meetings', Icon: Calendar, color: 'text-purple-300' },
  { id: 'settings',  label: 'Settings', Icon: Settings, color: 'text-white/60'   },
];

function AppShell() {
  const { currentUser, logout, userProfile, needsProfile } = useAuth();
  const [tab, setTab] = useState('home');

  if (!currentUser)  return <Login />;
  if (needsProfile)  return <SetupProfile />;

  const firstName = userProfile?.firstName || userProfile?.name?.split(' ')[0] || 'Friend';
  const roleLabel = ROLES_DISPLAY[userProfile?.role] || 'Publisher';

  const pageMap = {
    home:      <HomePage setTab={setTab} />,
    hours:     <HoursPage />,
    territory: <TerritoryPage />,
    visits:    <ReturnVisitsPage />,
    meetings:  <MeetingsPage />,
    settings:  <SettingsPage />,
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      <TopNav activeTab={tab} setTab={setTab} tabs={TABS} />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">{pageMap[tab]}</div>
      </main>

      <footer className="flex-shrink-0 flex items-center justify-between px-5 py-3
        bg-teal-900/90 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-500/25 rounded-full flex items-center justify-center">
            <span className="text-teal-300 text-sm font-bold">
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{firstName}</p>
            <p className="text-white/35 text-xs leading-tight">{roleLabel}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-1.5 text-white/35 hover:text-white/70
            transition-colors text-xs py-1.5 px-3 rounded-lg hover:bg-white/10">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </footer>
    </div>
  );
}

const ROLES_DISPLAY = {
  'publisher':         'Publisher',
  'auxiliary-pioneer': 'Auxiliary Pioneer',
  'regular-pioneer':   'Regular Pioneer',
  'special-pioneer':   'Special Pioneer',
};

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}
