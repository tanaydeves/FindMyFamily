import React from 'react';
import {
  UserPlus,
  ChevronRight,
  AlertTriangle,
  Radio,
  Signal,
  MessageSquare,
  Bluetooth,
  WifiOff,
  Navigation,
  Trash2,
  Battery,
  BatteryMedium,
  BatteryLow,
  MapPin,
  Heart,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FamilyMember, DistressAlert, ChildProfile } from '../types';
import { calculateDistance, calculateBearing } from '../services/navigationMath';

interface Props {
  myLocation: { latitude: number; longitude: number };
  pairedMembers: FamilyMember[];
  incomingDistress: DistressAlert | null;
  isOffline: boolean;
  registeredKids?: ChildProfile[];
  onSelectMember: (member: FamilyMember) => void;
  onOpenMap?: (member?: FamilyMember) => void;
  onOpenAddMember: () => void;
  onOpenAddKid?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onDismissDistress: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  myLocation,
  pairedMembers,
  incomingDistress,
  isOffline,
  registeredKids = [],
  onSelectMember,
  onOpenMap,
  onOpenAddMember,
  onOpenAddKid,
  onRemoveMember,
  onDismissDistress,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF9] text-[#0D2119] select-none relative overflow-hidden">
      {/* Network / Status Banner (directly under top bar) */}
      <div className="px-4 sm:px-6 pt-3 shrink-0">
        <div
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${
            isOffline
              ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
              : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isOffline ? (
              <>
                <MessageSquare className="w-4 h-4 text-[#D97706]" />
                <span>Using SMS Fallback (Offline)</span>
              </>
            ) : (
              <>
                <Signal className="w-4 h-4 text-[#16A34A]" />
                <span>Network Connected – Good Signal</span>
              </>
            )}
          </div>
          <span className="label-sm font-mono opacity-80 font-bold">
            {pairedMembers.length} Active
          </span>
        </div>
      </div>

      {/* Emergency Distress Banner if incoming alert */}
      <AnimatePresence>
        {incomingDistress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 sm:px-6 pt-2 shrink-0 overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#DC2626] shrink-0 animate-pulse">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="label-sm font-bold uppercase tracking-wider text-[#DC2626]">
                    Distress Alert Received
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#FEE2E2] px-2 py-0.5 rounded text-[#991B1B]">
                    NOW
                  </span>
                </div>
                <p className="text-sm font-medium mt-0.5 truncate">
                  <strong>{incomingDistress.senderName}</strong> signaled they are lost!
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      const matched = pairedMembers.find((m) => m.id === incomingDistress.senderId);
                      if (matched) onSelectMember(matched);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white label-sm font-bold shadow-xs hover:bg-[#B91C1C] cursor-pointer"
                  >
                    Track Target Now →
                  </button>
                  <button
                    onClick={onDismissDistress}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#5C7168] hover:text-[#0D2119] label-sm font-semibold cursor-pointer"
                  >
                    Dismiss Siren
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-24 space-y-4">
        {/* Title Header */}
        <div>
          <h2 className="headline-lg text-[#0D2119]">My Family</h2>
          <p className="body-md text-[#5C7168] mt-0.5">
            Select a member to track their location.
          </p>
        </div>

        {/* Protected Children (QR-Tags) Section */}
        {registeredKids.length > 0 && (
          <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C7168] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Protected Children (QR-Tags)</span>
              </span>
              {onOpenAddKid && (
                <button
                  onClick={onOpenAddKid}
                  className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer"
                >
                  + Add Kid
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {registeredKids.map((kid) => (
                <div
                  key={kid.qr_id}
                  className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={kid.photo_url}
                      alt={kid.child_name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#BBF7D0] shadow-2xs"
                    />
                    <div>
                      <h4 className="body-md font-bold text-[#0D2119]">
                        {kid.child_name || `${kid.mother_name}'s child`}
                      </h4>
                      <p className="text-[11px] font-mono text-[#5C7168]">
                        Tag: <span className="font-bold text-[#1B4332]">{kid.qr_id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {kid.isPendingSync ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Pending sync</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                        Active
                      </span>
                    )}
                    <a
                      href={`/lost/${kid.qr_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#1B4332] hover:bg-[#F1F5F9]"
                      title="View Public QR Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List of Member Cards (Level-1 Elevation) */}
        {pairedMembers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0] my-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F1F5F3] flex items-center justify-center text-[#1B4332] mx-auto mb-3">
              <UserPlus className="w-7 h-7" />
            </div>
            <h3 className="body-lg font-bold text-[#0D2119] mb-1">No Family Members Added Yet</h3>
            <p className="body-md text-sm text-[#5C7168] max-w-sm mx-auto mb-5 leading-relaxed">
              Pair your family's phones before entering the crowd to track their direction and distance in real-time.
            </p>
            {onOpenAddKid && (
              <div className="mb-3">
                <button
                  id="btn-add-kid-empty"
                  onClick={onOpenAddKid}
                  className="px-6 h-12 rounded-lg bg-white border-2 border-[#1B4332] text-[#1B4332] hover:bg-[#F1F5F3] label-lg font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Heart className="w-4 h-4 fill-[#16A34A] text-[#16A34A]" />
                  <span>Add Kid (QR Sticker)</span>
                </button>
              </div>
            )}
            <button
              onClick={onOpenAddMember}
              className="px-6 h-12 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Family Member</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pairedMembers.map((member) => {
              const distance = calculateDistance(
                myLocation.latitude,
                myLocation.longitude,
                member.lastLat,
                member.lastLng
              );
              const bearing = calculateBearing(
                myLocation.latitude,
                myLocation.longitude,
                member.lastLat,
                member.lastLng
              );
              const isLiveGps = member.source === 'relay' || member.source === 'gps';
              const isDisconnected = member.isOnline === false && (Date.now() - member.lastUpdated > 120000);

              return (
                <motion.div
                  key={member.id}
                  id={`member-card-${member.id}`}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  className="p-4 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all flex items-center justify-between shadow-xs group"
                >
                  {/* Left: Avatar + Name Stack */}
                  <div
                    onClick={() => onSelectMember(member)}
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base text-[#0D2119] shadow-xs shrink-0 ring-2 ring-[#E2E8F0]"
                      style={{ backgroundColor: member.color || '#38BDF8' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h3 className="body-lg font-bold text-[#0D2119] truncate group-hover:text-[#1B4332] transition-colors">
                        {member.name}
                      </h3>

                      {/* Status Row */}
                      <div className="flex items-center gap-2 mt-0.5">
                        {isDisconnected ? (
                          <span className="label-sm text-[#DC2626] font-semibold flex items-center gap-1">
                            <WifiOff className="w-3.5 h-3.5" />
                            <span>Disconnected</span>
                          </span>
                        ) : member.source === 'sms' ? (
                          <span className="label-sm text-[#D97706] font-semibold flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>SMS Fallback</span>
                          </span>
                        ) : member.source === 'ble' ? (
                          <span className="label-sm text-[#006D36] font-semibold flex items-center gap-1">
                            <Bluetooth className="w-3.5 h-3.5" />
                            <span>BLE Mesh</span>
                          </span>
                        ) : (
                          <span className="label-sm text-[#006D36] font-semibold flex items-center gap-1">
                            <Signal className="w-3.5 h-3.5" />
                            <span>Live Relay</span>
                          </span>
                        )}

                        <span className="text-[#CBD5E1]">•</span>
                        <span className="label-sm text-[#5C7168] flex items-center gap-1 font-mono font-bold">
                          {(member.battery ?? 90) <= 20 ? (
                            <BatteryLow className="w-3.5 h-3.5 text-[#DC2626]" />
                          ) : (member.battery ?? 90) <= 50 ? (
                            <BatteryMedium className="w-3.5 h-3.5 text-[#D97706]" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-[#166534]" />
                          )}
                          <span
                            className={
                              (member.battery ?? 90) <= 20
                                ? 'text-[#DC2626]'
                                : (member.battery ?? 90) <= 50
                                ? 'text-[#D97706]'
                                : 'text-[#166534]'
                            }
                          >
                            {member.battery ?? 90}%
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Distance Badge + Map Button + Chevron */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {onOpenMap && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMap(member);
                        }}
                        className="p-1.5 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        title="View on Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    )}

                    <div
                      onClick={() => onSelectMember(member)}
                      className="text-right cursor-pointer"
                    >
                      <div
                        className={`px-2.5 py-1 rounded-2xl label-sm font-bold font-mono inline-block ${
                          isLiveGps
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}
                      </div>
                    </div>

                    {onRemoveMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove ${member.name} from paired phones?`)) {
                            onRemoveMember(member.id);
                          }
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#DC2626] flex items-center justify-center cursor-pointer transition-all"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div onClick={() => onSelectMember(member)} className="cursor-pointer">
                      <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#1B4332] transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* "Add Kid" button placed directly ABOVE the existing "Add Family Member" button */}
      {onOpenAddKid && (
        <button
          id="btn-add-kid"
          onClick={onOpenAddKid}
          className="absolute bottom-22 right-6 h-12 px-4 rounded-full bg-white border border-[#CBD5E1] hover:border-[#1B4332] text-[#1B4332] font-bold text-xs shadow-lg flex items-center gap-2 z-30 cursor-pointer active:scale-95 transition-all"
          title="Add Kid (QR Sticker)"
          aria-label="Add Kid"
        >
          <Heart className="w-4 h-4 text-[#16A34A] fill-[#16A34A]" />
          <span>Add Kid</span>
        </button>
      )}

      {/* Floating Action Button (FAB) (56px, #1B4332 filled, white "+") */}
      <button
        id="fab-add-member"
        onClick={onOpenAddMember}
        className="absolute bottom-5 right-6 w-14 h-14 rounded-full bg-[#1B4332] hover:bg-[#012D1D] active:scale-95 text-white shadow-lg flex items-center justify-center z-30 cursor-pointer transition-transform"
        title="Add Family Member (+)"
        aria-label="Add Family Member"
      >
        <span className="text-2xl font-light leading-none">+</span>
      </button>
    </div>
  );
};
