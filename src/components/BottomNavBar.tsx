import React from 'react';
import { Users, MapPin, Compass, Settings } from 'lucide-react';

export type TabType = 'family' | 'map' | 'track' | 'settings';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasTrackTarget?: boolean;
}

export const BottomNavBar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  hasTrackTarget = false,
}) => {
  const tabs = [
    {
      id: 'family' as TabType,
      label: 'My Family',
      icon: Users,
    },
    {
      id: 'map' as TabType,
      label: 'Live Map',
      icon: MapPin,
    },
    {
      id: 'track' as TabType,
      label: 'Radar',
      icon: Compass,
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="w-full bg-[#FFFFFF] border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-around shrink-0 select-none z-20 shadow-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`bottom-nav-${tab.id}`}
            onClick={() => onSelectTab(tab.id)}
            className={`min-h-[48px] px-4 py-2 rounded-2xl flex items-center gap-2 transition-all cursor-pointer ${
              isActive
                ? 'bg-[#4ADE80] text-[#0D2119] font-bold shadow-xs'
                : 'text-[#5C7168] hover:text-[#0D2119] font-medium'
            }`}
            aria-label={tab.label}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              {tab.id === 'track' && hasTrackTarget && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span className="text-sm font-['Inter']">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
