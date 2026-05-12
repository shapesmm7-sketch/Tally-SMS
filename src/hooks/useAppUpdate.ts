import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';

export function useAppUpdate() {
  useEffect(() => {
    const checkForUpdate = async () => {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
        return;
      }

      try {
        const result = await AppUpdate.getAppUpdateInfo();
        
        if (result.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
          if (result.immediateUpdateAllowed) {
            await AppUpdate.performImmediateUpdate();
          } else if (result.flexibleUpdateAllowed) {
            await AppUpdate.startFlexibleUpdate();
          }
        }
      } catch (error) {
        console.error('Error checking for app update:', error);
      }
    };

    checkForUpdate();
  }, []);
}
