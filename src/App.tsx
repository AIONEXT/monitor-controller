import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, MonitorSetting, MonitorCapabilities } from './monitor-types';
import { MonitorSelector } from './components/MonitorSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { Header } from './components/Header';
import { PresetsPanel } from './components/PresetsPanel';
import { UpdateBanner } from './components/UpdateBanner';
import { ToastContainer, Toast } from './components/Toast';
import { Icon } from './components/Icon';
import type { UpdateInfo, UpdateProgress } from './types/electron-api';

const PRESETS = [
  { id: 'standard', name: 'Standard', icon: 'monitor', description: 'Balanced settings for daily use' },
  { id: 'gaming', name: 'Gaming', icon: 'gamepad', description: 'High brightness, low latency' },
  { id: 'movie', name: 'Movie', icon: 'film', description: 'Cinematic color and contrast' },
  { id: 'reading', name: 'Reading', icon: 'book', description: 'Low blue light, comfortable brightness' },
  { id: 'custom', name: 'Custom', icon: 'sliders', description: 'Your personalized settings' },
];

const PRESET_VALUES: Record<string, Partial<Record<string, number>>> = {
  standard: { brightness: 75, contrast: 70, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0 },
  gaming: { brightness: 85, contrast: 80, sharpness: 60, colorTemp: 6500, gamma: 22, blueLight: 0 },
  movie: { brightness: 60, contrast: 85, sharpness: 40, colorTemp: 6500, gamma: 24, blueLight: 10 },
  reading: { brightness: 40, contrast: 60, sharpness: 55, colorTemp: 5500, gamma: 22, blueLight: 40 },
};

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

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
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const loadMonitors = useCallback(async (force = false) => {
    setIsLoading(true);
    setRefreshing(true);
    try {
      const api = window.electronAPI;
      const monitorsData = await api.getMonitors();
      setMonitors(monitorsData);
      
      if (monitorsData.length > 0) {
        const primary = monitorsData.find((m: Monitor) => m.isPrimary) || monitorsData[0];
        if (!selectedMonitorId || force) {
          setSelectedMonitorId(primary.id);
        }
      } else {
        showToast('No monitors detected. Enable DDC/CI in monitor OSD.', 'info');
      }
    } catch (error) {
      console.error('Failed to load monitors:', error);
      showToast('Failed to detect monitors', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonitorId, showToast]);

  const loadSettings = useCallback(async (monitorId: string) => {
    try {
      const api = window.electronAPI;
      const [settingsData, capsData] = await Promise.all([
        api.getMonitorSettings(monitorId),
        api.getMonitorCapabilities(monitorId),
      ]);
      setSettings(settingsData);
      setCapabilities(capsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load monitor settings', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMonitors(true);
  }, [loadMonitors]);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  useEffect(() => {
    if (selectedMonitorId) {
      loadSettings(selectedMonitorId);
      setActivePreset('custom');
    }
  }, [selectedMonitorId, loadSettings]);

  useEffect(() => {
    const api = window.electronAPI;
    
    const unsubUpdateAvailable = api.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setShowUpdateBanner(true);
    });
    
    const unsubUpdateDownloaded = api.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateInfo(info);
      setShowUpdateBanner(true);
    });
    
    const unsubUpdateError = api.onUpdateError((error: { message: string }) => {
      showToast(`Update error: ${error.message}`, 'error');
    });
    
    const unsubUpdateProgress = api.onUpdateProgress((progress: UpdateProgress) => {
      setUpdateProgress(progress);
    });

    return () => {
      unsubUpdateAvailable();
      unsubUpdateDownloaded();
      unsubUpdateError();
      unsubUpdateProgress();
    };
  }, [showToast]);

  const handleSettingChange = async (settingId: string, value: number) => {
    if (!selectedMonitorId) return;
    try {
      const api = window.electronAPI;
      const updated = await api.setMonitorSetting(selectedMonitorId, settingId, value);
      if (updated) {
        setSettings(prev => prev.map(s => s.id === settingId ? updated : s));
      }
      setActivePreset('custom');
    } catch (error) {
      console.error('Failed to update setting:', error);
      showToast(`Failed to update ${settingId}`, 'error');
    }
  };

  const applyPreset = async (presetId: string) => {
    if (!selectedMonitorId || presetId === 'custom') {
      setActivePreset(presetId);
      return;
    }
    const values = PRESET_VALUES[presetId];
    if (!values) return;

    try {
      const api = window.electronAPI;
      for (const [settingId, value] of Object.entries(values)) {
        if (value !== undefined) {
          await api.setMonitorSetting(selectedMonitorId, settingId, value);
        }
      }
      await loadSettings(selectedMonitorId);
      setActivePreset(presetId);
      showToast(`Applied ${presetId} preset`, 'success');
    } catch (error) {
      console.error('Failed to apply preset:', error);
      showToast('Failed to apply preset', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!selectedMonitorId) return;
    try {
      const api = window.electronAPI;
      await api.resetMonitorSettings(selectedMonitorId);
      await loadSettings(selectedMonitorId);
      setActivePreset('custom');
      showToast('Reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset:', error);
      showToast('Failed to reset settings', 'error');
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      const api = window.electronAPI;
      await api.downloadUpdate();
    } catch {
      showToast('Failed to download update', 'error');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const api = window.electronAPI;
      await api.quitAndInstall();
    } catch {
      showToast('Failed to install update', 'error');
    }
  };

  const selectedMonitor = monitors.find(m => m.id === selectedMonitorId);

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loader">
          <div className="loader-ring"></div>
          <span>Detecting monitors...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        version={appVersion}
        onMinimize={() => window.electronAPI.windowMinimize()}
        onMaximize={() => window.electronAPI.windowMaximize()}
        onClose={() => window.electronAPI.windowClose()}
      />
      
      {showUpdateBanner && updateInfo && (
        <UpdateBanner
          info={updateInfo}
          progress={updateProgress}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3 className="section-title">
              <Icon name="monitor" size={16} />
              Monitors
            </h3>
            <button
              className="icon-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh monitors"
              title="Refresh monitors"
            >
              <Icon name={refreshing ? 'refresh' : 'refresh'} size={16} className={refreshing ? 'spinning' : ''} />
            </button>
          </div>
          
          <MonitorSelector
            monitors={monitors}
            selectedId={selectedMonitorId}
            onSelect={setSelectedMonitorId}
          />
          
          <PresetsPanel
            presets={PRESETS}
            activePreset={activePreset}
            onApply={applyPreset}
          />
        </aside>
        
        <section className="content">
          {selectedMonitor ? (
            <SettingsPanel
              monitor={selectedMonitor}
              settings={settings}
              capabilities={capabilities}
              onChange={handleSettingChange}
              onReset={handleResetDefaults}
            />
          ) : (
            <div className="empty-state">
              <Icon name="monitor" size={64} />
              <h2>No Monitor Selected</h2>
              <p>Select a monitor from the sidebar to adjust its settings</p>
            </div>
          )}
        </section>
      </main>

      <ToastContainer>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </ToastContainer>
    </div>
  );
};