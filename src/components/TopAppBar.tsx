import React from 'react';
import { Menu } from 'lucide-react';

interface Props {
  title?: string;
  myDeviceName: string;
  myColor?: string;
  onOpenDrawer: () => void;
  onOpenProfile: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const TopAppBar: React.FC<Props> = ({
  title = 'Find My Family',
  myDeviceName,
  myColor = '#4ADE80',
  onOpenDrawer,
  onOpenProfile,
  showBack = false,
  onBack,
}) => {
  return (
    <header className="w-full h-16 bg-[#F8FAF9] border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Hamburger menu button (48x48 tap target) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="btn-open-nav-drawer"
          onClick={onOpenDrawer}
          className="w-12 h-12 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Title in headline-md */}
        <h1 className="text-xl sm:text-2xl font-bold text-[#0D2119] truncate tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right: Circular Profile Avatar (40px) */}
      <button
        id="btn-topbar-profile-avatar"
        onClick={onOpenProfile}
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#0D2119] ring-2 ring-[#E2E8F0] hover:ring-[#1B4332] transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
        style={{ backgroundColor: myColor }}
        title={`Profile: ${myDeviceName}`}
        aria-label="My Profile"
      >
        {myDeviceName.charAt(0).toUpperCase()}
      </button>
    </header>
  );
};
