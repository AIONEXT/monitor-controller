import React from 'react';
import { Icon } from './Icon';
import type { UpdateInfo, UpdateProgress } from '../types/electron-api';

interface UpdateBannerProps {
  info: UpdateInfo;
  progress: UpdateProgress | null;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ 
  info, 
  progress, 
  onDownload, 
  onInstall, 
  onDismiss 
}) => {
  const isDownloading = progress && progress.percent !== undefined;
  const isDownloaded = info && !isDownloading;

  return (
    <div className="update-banner" role="alert">
      <div className="update-content">
        <div className="update-icon">
          <Icon name={isDownloading ? 'download' : 'alert'} size={24} />
        </div>
        <div className="update-info">
          <strong>Update Available</strong>
          <span>Version {info?.version} is ready to install</span>
        </div>
        <div className="update-actions">
          {isDownloading && (
            <div className="download-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span>{progress.percent}%</span>
            </div>
          )}
          {!isDownloading && !isDownloaded && (
            <button className="btn-primary" onClick={onDownload}>
              <Icon name="download" size={14} />
              Download
            </button>
          )}
          {isDownloaded && (
            <button className="btn-primary" onClick={onInstall}>
              <Icon name="check" size={14} />
              Install Now
            </button>
          )}
          <button className="btn-ghost" onClick={onDismiss}>
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};