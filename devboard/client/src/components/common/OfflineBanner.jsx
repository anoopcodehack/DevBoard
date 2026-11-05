import React, { useEffect, useState } from "react";

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    // The state can be stale if the connection changed before this effect ran.
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="no-print fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs text-center font-medium py-2 px-4"
    >
      You're offline. Changes won't be saved until you reconnect.
    </div>
  );
};

export default OfflineBanner;
