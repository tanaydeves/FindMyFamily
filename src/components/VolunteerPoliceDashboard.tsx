import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Filter,
  UserCheck,
  Building,
  RefreshCw,
  Search,
  Eye,
  Sparkles,
} from 'lucide-react';
import { LostAlert, VolunteerCenter, DashboardRole } from '../types';
import { lostChildService } from '../services/lostChildService';
import { relayClient } from '../services/relayClient';

interface Props {
  onBackToApp?: () => void;
}

export const VolunteerPoliceDashboard: React.FC<Props> = ({ onBackToApp }) => {
  const [role, setRole] = useState<DashboardRole>('police');
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [centers, setCenters] = useState<VolunteerCenter[]>([]);
  const [alerts, setAlerts] = useState<LostAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'audit'>('active');

  // Confirmation Modal for "Reunited with parent?"
  const [resolvingAlert, setResolvingAlert] = useState<LostAlert | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Relative time helper
  const getRelativeTime = (timestamp: string | number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedCenters = await lostChildService.getVolunteerCenters();
      setCenters(fetchedCenters);

      const centerFilter = selectedCenterId !== 'all' ? selectedCenterId : undefined;
      const fetchedAlerts = await lostChildService.getDashboardAlerts(role, centerFilter);
      setAlerts(fetchedAlerts);
    } catch (err) {
      console.error('[DASHBOARD] Failed to fetch alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, selectedCenterId]);

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    const socket = relayClient.getSocket();
    if (!socket) return;

    const handleNewAlert = (newAlert: LostAlert) => {
      console.log('[DASHBOARD WS] New lost alert received:', newAlert);
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.alert_id !== newAlert.alert_id)]);
    };

    const handleAlertAcknowledged = (updated: { alert_id: string }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === updated.alert_id ? { ...a, status: 'acknowledged' } : a))
      );
    };

    const handleAlertResolved = (updated: { alert_id: string }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === updated.alert_id ? { ...a, status: 'resolved' } : a))
      );
    };

    socket.on('lost_alert_created', handleNewAlert);
    socket.on('alert_acknowledged', handleAlertAcknowledged);
    socket.on('alert_resolved', handleAlertResolved);

    return () => {
      socket.off('lost_alert_created', handleNewAlert);
      socket.off('alert_acknowledged', handleAlertAcknowledged);
      socket.off('alert_resolved', handleAlertResolved);
    };
  }, []);

  // Action: Acknowledge
  const handleAcknowledge = async (alert: LostAlert) => {
    setIsProcessingAction(true);
    const ok = await lostChildService.acknowledgeAlert(alert.alert_id, `${role}_operator_1`);
    setIsProcessingAction(false);
    if (ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === alert.alert_id ? { ...a, status: 'acknowledged' } : a))
      );
    }
  };

  // Action: Resolve with Confirmation
  const handleConfirmResolve = async () => {
    if (!resolvingAlert) return;
    setIsProcessingAction(true);
    const ok = await lostChildService.resolveAlert(resolvingAlert.alert_id, `${role}_officer_lead`);
    setIsProcessingAction(false);
    if (ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === resolvingAlert.alert_id ? { ...a, status: 'resolved' } : a))
      );
      setResolvingAlert(null);
    }
  };

  // Filter alerts by tab
  const displayedAlerts = alerts.filter((a) => {
    if (activeTab === 'active') return a.status === 'open' || a.status === 'acknowledged';
    if (activeTab === 'resolved') return a.status === 'resolved';
    return true; // audit
  });

  return (
    <div className="min-h-screen bg-[#F1F5F3] text-[#0D2119] flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="bg-[#1B4332] text-white px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg shadow-inner">
            <Shield className="w-6 h-6 text-[#4ADE80]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight">
                Find My Family • Central Command
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                <span>LIVE FEED</span>
              </span>
            </div>
            <p className="text-xs text-white/70">
              Kumbh Mela Lost Child Recovery & Ground Rescue Dispatch
            </p>
          </div>
        </div>

        {/* Access Tier Switcher & Quick Navigation */}
        <div className="flex items-center gap-3">
          {/* Role Toggle */}
          <div className="bg-black/20 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => {
                setRole('volunteer');
                if (centers.length > 0 && selectedCenterId === 'all') {
                  setSelectedCenterId(centers[0].center_id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'volunteer'
                  ? 'bg-white text-[#1B4332] shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Volunteer (Zone View)
            </button>
            <button
              onClick={() => {
                setRole('police');
                setSelectedCenterId('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                role === 'police'
                  ? 'bg-[#4ADE80] text-[#0D2119] shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Police (System-Wide)
            </button>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              Back to Mobile App
            </button>
          )}
        </div>
      </header>

      {/* Sub-Header Controls: Zone Selector + Feed Tabs */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Feed Status Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-[#F8FAF9] text-[#5C7168] hover:bg-[#E2E8F0]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Active Alerts ({alerts.filter((a) => a.status !== 'resolved').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resolved'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-[#F8FAF9] text-[#5C7168] hover:bg-[#E2E8F0]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Resolved History ({alerts.filter((a) => a.status === 'resolved').length})</span>
          </button>

          {role === 'police' && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-[#F8FAF9] text-[#5C7168] hover:bg-[#E2E8F0]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Misuse & IP Audit Log</span>
            </button>
          )}
        </div>

        {/* Zone Filter (Mandatory for Volunteer, Optional for Police) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5C7168] flex items-center gap-1">
            <Building className="w-3.5 h-3.5" />
            <span>Assigned Sector:</span>
          </span>
          <select
            value={selectedCenterId}
            onChange={(e) => setSelectedCenterId(e.target.value)}
            disabled={role === 'volunteer' && centers.length === 0}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#0D2119] outline-none cursor-pointer"
          >
            {role === 'police' && <option value="all">All Grounds (System-Wide)</option>}
            {centers.map((c) => (
              <option key={c.center_id} value={c.center_id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Refresh Feed"
            className="p-1.5 rounded-lg bg-[#F8FAF9] border border-[#CBD5E1] text-[#5C7168] hover:text-[#0D2119] hover:bg-white cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Alerts Feed Grid */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        {isLoading && alerts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-3 border-[#1B4332]/20 border-t-[#1B4332] rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-[#5C7168]">Loading live rescue feed...</p>
          </div>
        ) : displayedAlerts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E2E8F0] shadow-xs space-y-3 p-8">
            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0D2119]">No Open Lost Child Alerts</h3>
            <p className="text-xs text-[#5C7168] max-w-sm mx-auto leading-relaxed">
              All sectors are currently clear. When a bystander scans a child's QR wristband, the alert will pop up here instantly via real-time relay.
            </p>
            <div className="pt-2">
              <a
                href="/lost/QR-KUMBH-001"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold shadow-xs hover:bg-[#012D1D] transition-all"
              >
                <span>Simulate Bystander Scan (Test QR-KUMBH-001)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : activeTab === 'audit' ? (
          /* Police Misuse & Audit Log Table */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#F8FAF9] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0D2119]">Anti-Misuse & Submission Audit Log</h3>
                <p className="text-xs text-[#5C7168]">
                  Submissions logged with IP address and device fingerprint for fraud prevention.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1F5F9] text-[#5C7168] uppercase font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-3">Alert ID / Tag</th>
                    <th className="p-3">Reported Time</th>
                    <th className="p-3">Finder IP Address</th>
                    <th className="p-3">Device Fingerprint</th>
                    <th className="p-3">Finder Contact</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {displayedAlerts.map((a) => (
                    <tr key={a.alert_id} className="hover:bg-[#F8FAF9]">
                      <td className="p-3 font-mono font-bold text-[#1B4332]">
                        {a.qr_id}
                        <span className="block text-[10px] text-[#5C7168] font-normal">{a.alert_id.slice(0, 8)}...</span>
                      </td>
                      <td className="p-3 text-[#5C7168]">{new Date(a.reported_at).toLocaleTimeString()}</td>
                      <td className="p-3 font-mono text-[#0D2119]">{a.finder_ip || '127.0.0.1'}</td>
                      <td className="p-3 text-[#5C7168] truncate max-w-xs">{a.finder_user_agent || 'Mozilla/5.0 Mobile'}</td>
                      <td className="p-3 font-mono">{a.finder_contact_optional || 'Not provided'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'open'
                            ? 'bg-[#FEF2F2] text-[#DC2626]'
                            : a.status === 'acknowledged'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#DCFCE7] text-[#166534]'
                        }`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Live Alert Cards Feed */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedAlerts.map((alert) => {
              const isOpen = alert.status === 'open';
              const isAcknowledged = alert.status === 'acknowledged';

              return (
                <div
                  key={alert.alert_id}
                  className={`bg-white rounded-2xl border-2 shadow-xs overflow-hidden flex flex-col justify-between transition-all ${
                    isOpen
                      ? 'border-[#DC2626] ring-2 ring-[#DC2626]/10 animate-in fade-in'
                      : isAcknowledged
                      ? 'border-[#F59E0B]'
                      : 'border-[#E2E8F0] opacity-80'
                  }`}
                >
                  {/* Card Top Banner */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold ${
                      isOpen
                        ? 'bg-[#DC2626] text-white'
                        : isAcknowledged
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#F1F5F9] text-[#5C7168]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isOpen && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                      <span className="uppercase tracking-wider">
                        {isOpen ? 'Emergency Alert' : isAcknowledged ? 'Volunteer En Route' : 'Resolved'}
                      </span>
                    </div>
                    <span className="font-mono text-[11px]">
                      {getRelativeTime(alert.reported_at)}
                    </span>
                  </div>

                  {/* Child & Location Details Body */}
                  <div className="p-4 space-y-3.5 flex-1">
                    {/* Child Profile Preview */}
                    <div className="flex items-center gap-3.5">
                      <img
                        src={
                          alert.child?.photo_url ||
                          'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80'
                        }
                        alt="Child"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#E2E8F0] shadow-xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-[#0D2119] truncate">
                          {alert.child?.child_name || 'Protected Child'}
                        </h3>
                        <p className="text-xs text-[#5C7168]">
                          Parents: {alert.child?.mother_name || 'Registered Parent'} & {alert.child?.father_name || ''}
                        </p>
                        <span className="text-[10px] font-mono font-bold text-[#1B4332] bg-[#F1F5F3] px-2 py-0.5 rounded mt-1 inline-block">
                          Tag: {alert.qr_id}
                        </span>
                      </div>
                    </div>

                    {/* Reported Location Pin & Coordinates */}
                    <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-1 text-xs">
                      <div className="flex items-start gap-2 text-[#0D2119] font-bold">
                        <MapPin className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                        <span>
                          {alert.finder_landmark_note || 'Location Reported by Bystander'}
                        </span>
                      </div>

                      {alert.finder_lat && alert.finder_lng && (
                        <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-[#5C7168]">
                          <span>
                            {alert.finder_lat.toFixed(5)}, {alert.finder_lng.toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${alert.finder_lat},${alert.finder_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1B4332] font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Bystander Contact Info (if voluntarily shared) */}
                    {alert.finder_contact_optional && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0D2119] bg-[#DCFCE7] p-2 rounded-xl border border-[#BBF7D0]">
                        <Phone className="w-3.5 h-3.5 text-[#166534]" />
                        <span>Bystander Contact: </span>
                        <a
                          href={`tel:${alert.finder_contact_optional}`}
                          className="font-mono text-[#166534] font-bold hover:underline"
                        >
                          {alert.finder_contact_optional}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-[#F8FAF9] border-t border-[#E2E8F0] flex items-center gap-2">
                    {isOpen && (
                      <button
                        onClick={() => handleAcknowledge(alert)}
                        disabled={isProcessingAction}
                        className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Acknowledge (En Route)</span>
                      </button>
                    )}

                    {(isOpen || isAcknowledged) && (
                      <button
                        onClick={() => setResolvingAlert(alert)}
                        disabled={isProcessingAction}
                        className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#012D1D] text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {alert.status === 'resolved' && (
                      <div className="w-full py-2 text-center text-xs font-bold text-[#166534]">
                        ✓ Reunited & Closed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal for "Reunited with parent?" */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-[#E2E8F0] text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#0D2119]">
                Reunited with parent?
              </h3>
              <p className="text-xs text-[#5C7168] mt-1 leading-relaxed">
                Confirming reunion will mark alert <strong>{resolvingAlert.alert_id.slice(0, 8)}</strong> as resolved, and per safety policy, retire QR sticker <strong>{resolvingAlert.qr_id}</strong> permanently to prevent data leakage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolvingAlert(null)}
                className="py-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#5C7168] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={isProcessingAction}
                className="py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                Yes, Reunited
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
