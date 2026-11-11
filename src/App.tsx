import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, MonitorSetting, MonitorCapabilities } from './monitor-types';
import { MonitorSelector } from './components/MonitorSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { Header } from './components/Header';
import { PresetsPanel } from './components/PresetsPanel';
import { UpdateBanner } from './components/UpdateBanner';
import { ToastContainer, Toast } from './components/Toast';
import { Icon } from './components/Icon';
import { ProfileManager } from './components/ProfileManager';
import { BrandCalibrationPanel } from './components/BrandCalibrationPanel';
import { BrandCompatibilityPanel } from './components/BrandCompatibilityPanel';
import { enterprise } from './services/enterprise-service';
import { resolveCalibration, resolvePreset, UNIVERSAL_PRESETS, type BrandCalibrationProfile } from './services/universal-control';
import type { MonitorProfile } from './monitor-types';
import type { UpdateInfo, UpdateProgress } from './types/electron-api';

interface ToastMessage { id: number; message: string; type: 'success' | 'error' | 'info' }

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('');
  const [settings, setSettings] = useState<MonitorSetting[]>([]);
  const [capabilities, setCapabilities] = useState<MonitorCapabilities>({});
  const [activePreset, setActivePreset] = useState<string>('custom');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  }, []);

  const loadMonitors = useCallback(async (force = false) => {
    setIsLoading(true);
    setRefreshing(true);
    try {
      const monitorsData = await window.electronAPI.getMonitors();
      setMonitors(monitorsData);
      if (monitorsData.length > 0) {
        const primary = monitorsData.find((monitor) => monitor.isPrimary) || monitorsData[0];
        if (!selectedMonitorId || force || !monitorsData.some((monitor) => monitor.id === selectedMonitorId)) setSelectedMonitorId(primary.id);
      } else {
        setSelectedMonitorId('');
        showToast('No monitors detected. Enable DDC/CI in monitor OSD.', 'info');
      }
    } catch (error) {
      console.error('Failed to load monitors:', error);
      showToast('Failed to detect monitors', 'error');
    } finally { setIsLoading(false); setRefreshing(false); }
  }, [selectedMonitorId, showToast]);

  const loadSettings = useCallback(async (monitorId: string) => {
    try {
      const [settingsData, capsData] = await Promise.all([
        window.electronAPI.getMonitorSettings(monitorId),
        window.electronAPI.getMonitorCapabilities(monitorId),
      ]);
      setSettings(settingsData);
      setCapabilities(capsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load monitor settings', 'error');
    }
  }, [showToast]);

  useEffect(() => { window.electronAPI.getAppVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0')); }, []);
  const handleRefresh = useCallback(async () => loadMonitors(true), [loadMonitors]);
  useEffect(() => { loadMonitors(); }, [loadMonitors]);
  useEffect(() => {
    if (selectedMonitorId) { loadSettings(selectedMonitorId); setActivePreset('custom'); }
    else { setSettings([]); setCapabilities({}); }
  }, [selectedMonitorId, loadSettings]);

  useEffect(() => {
    const api = window.electronAPI;
    const unsubUpdateAvailable = api.onUpdateAvailable((info: UpdateInfo) => { setUpdateInfo(info); setShowUpdateBanner(true); });
    const unsubUpdateDownloaded = api.onUpdateDownloaded((info: UpdateInfo) => { setUpdateInfo(info); setShowUpdateBanner(true); });
    const unsubUpdateError = api.onUpdateError((error: { message: string }) => showToast(`Update error: ${error.message}`, 'error'));
    const unsubUpdateProgress = api.onUpdateProgress((progress: UpdateProgress) => setUpdateProgress(progress));
    return () => { unsubUpdateAvailable(); unsubUpdateDownloaded(); unsubUpdateError(); unsubUpdateProgress(); };
  }, [showToast]);

  const handleSettingChange = async (settingId: string, value: number) => {
    if (!selectedMonitorId) return;
    try {
      const updated = await window.electronAPI.setMonitorSetting(selectedMonitorId, settingId, value);
      if (updated) {
        setSettings((prev) => prev.map((setting) => setting.id === settingId ? updated : setting));
        const cfg = enterprise.getConfigSync();
        if (cfg.enableAuditLogging) {
          const oldValue = settings.find((setting) => setting.id === settingId)?.value ?? value;
          enterprise.logChange({ monitorId: selectedMonitorId, settingId, oldValue, newValue: updated.value, action: 'set' }).catch(() => { /* non-fatal */ });
        }
      }
      setActivePreset('custom');
    } catch (error) { console.error('Failed to update setting:', error); showToast(`Failed to update ${settingId}`, 'error'); }
  };

  const applyValues = async (entries: Array<{ settingId: string; value: number }>, successMessage: string) => {
    if (!selectedMonitorId || entries.length === 0) { showToast('No supported controls are available for this preset/profile', 'info'); return false; }
    try {
      let applied = 0;
      for (const entry of entries) {
        if (await window.electronAPI.setMonitorSetting(selectedMonitorId, entry.settingId, entry.value)) applied += 1;
      }
      await loadSettings(selectedMonitorId);
      if (applied === 0) { showToast('The monitor rejected all requested controls', 'error'); return false; }
      showToast(applied < entries.length ? `${successMessage} (${applied}/${entries.length} supported controls)` : successMessage, 'success');
      return true;
    } catch (error) {
      console.error('Failed to apply monitor values:', error);
      showToast('Some monitor settings could not be applied', 'error');
      await loadSettings(selectedMonitorId);
      return false;
    }
  };

  const handleApplyProfile = async (profile: MonitorProfile) => {
    await enterprise.applyProfile(profile.id, []);
    if (selectedMonitorId) await loadSettings(selectedMonitorId);
    const cfg = enterprise.getConfigSync();
    if (cfg.enableAuditLogging) enterprise.logChange({ monitorId: '*', settingId: '*', oldValue: -1, newValue: -1, action: 'profile_apply' }).catch(() => { /* non-fatal */ });
  };

  const applyPreset = async (presetId: string) => {
    if (!selectedMonitorId || presetId === 'custom') { setActivePreset(presetId); return; }
    const monitor = monitors.find((candidate) => candidate.id === selectedMonitorId);
    if (!monitor) return;
    const success = await applyValues(resolvePreset(monitor, settings, presetId), `Applied ${UNIVERSAL_PRESETS.find((preset) => preset.id === presetId)?.name ?? presetId} preset`);
    if (success) setActivePreset(presetId);
  };

  const applyCalibration = async (profile: BrandCalibrationProfile) => {
    const monitor = monitors.find((candidate) => candidate.id === selectedMonitorId);
    if (monitor && await applyValues(resolveCalibration(monitor, settings, profile), `Applied ${profile.name}`)) setActivePreset('custom');
  };

  const handleResetDefaults = async () => {
    if (!selectedMonitorId) return;
    try {
      await window.electronAPI.resetMonitorSettings(selectedMonitorId);
      await loadSettings(selectedMonitorId); setActivePreset('custom'); showToast('Reset to defaults', 'success');
    } catch (error) { console.error('Failed to reset:', error); showToast('Failed to reset settings', 'error'); }
  };
  const handleDownloadUpdate = async () => { try { await window.electronAPI.downloadUpdate(); } catch { showToast('Failed to download update', 'error'); } };
  const handleInstallUpdate = async () => { try { await window.electronAPI.quitAndInstall(); } catch { showToast('Failed to install update', 'error'); } };
  const selectedMonitor = monitors.find((monitor) => monitor.id === selectedMonitorId);

  if (isLoading) return <div className="app loading"><div className="loader"><div className="loader-ring" /><span>Detecting monitors...</span></div></div>;

  return (
    <div className="app">
      <Header version={appVersion} onMinimize={() => window.electronAPI.windowMinimize()} onMaximize={() => window.electronAPI.windowMaximize()} onClose={() => window.electronAPI.windowClose()} />
      {showUpdateBanner && updateInfo && <UpdateBanner info={updateInfo} progress={updateProgress} onDownload={handleDownloadUpdate} onInstall={handleInstallUpdate} onDismiss={() => setShowUpdateBanner(false)} />}
      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-header"><h3 className="section-title"><Icon name="monitor" size={16} /> Monitors</h3><button className="icon-btn" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh monitors" title="Refresh monitors"><Icon name="refresh" size={16} className={refreshing ? 'spinning' : ''} /></button></div>
          <MonitorSelector monitors={monitors} selectedId={selectedMonitorId} onSelect={setSelectedMonitorId} />
          <PresetsPanel presets={UNIVERSAL_PRESETS.map(({ values: _values, ...preset }) => preset)} activePreset={activePreset} onApply={applyPreset} />
          {selectedMonitor && <BrandCalibrationPanel monitor={selectedMonitor} settings={settings} onApply={applyCalibration} showToast={showToast} />}
          <BrandCompatibilityPanel monitors={monitors} />
          <ProfileManager monitors={monitors} onApply={handleApplyProfile} showToast={showToast} />
        </aside>
        <section className="content">
          {selectedMonitor ? <SettingsPanel monitor={selectedMonitor} settings={settings} capabilities={capabilities} onChange={handleSettingChange} onReset={handleResetDefaults} /> : <div className="empty-state"><Icon name="monitor" size={64} /><h2>No Monitor Selected</h2><p>Select a monitor from the sidebar to adjust its settings</p></div>}
        </section>
      </main>
      <ToastContainer>{toasts.map((toast) => <Toast key={toast.id} message={toast.message} type={toast.type} />)}</ToastContainer>
    </div>
  );
};
