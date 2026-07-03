export default function TopNav({ activeTab, setTab, tabs }) {
  return (
    <nav className="flex-shrink-0 bg-teal-900/95 backdrop-blur-sm border-b border-white/10 px-1 pt-1 pb-0">
      <div className="flex items-end justify-around overflow-x-auto scrollbar-none">
        {tabs.map(({ id, label, Icon, color }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-t-xl
                transition-all duration-150 flex-1 min-w-0 border-b-2
                ${isActive ? 'bg-white/10 border-teal-400' : 'border-transparent hover:bg-white/5'}`}>
              <Icon className={`w-4.5 h-4.5 ${isActive ? color : 'text-white/30'}`} style={{width:'18px',height:'18px'}} />
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${isActive ? 'text-white' : 'text-white/30'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
