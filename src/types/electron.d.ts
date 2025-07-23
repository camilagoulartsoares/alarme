export {};

declare global {
  interface Window {
    electronAPI: {
      setAlarmStatus: (status: boolean) => void;
      forceCloseAll: () => void;
    };
  }
}
