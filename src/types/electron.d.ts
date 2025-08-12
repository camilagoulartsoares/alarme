export {};

declare global {
  interface Window {
    electronAPI: {
      setAlarmStatus: (status: boolean) => void;
      forceCloseAll: () => void;
      setAlarmTime: (time: string) => void;
      getAlarmTime: () => Promise<string>;
      onSyncAlarmTime: (callback: (time: string) => void) => void;
      onSyncAlarmStatus: (callback: (status: boolean) => void) => void;
    };
  }
}




