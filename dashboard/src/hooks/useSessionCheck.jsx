import { useEffect, useRef } from 'react';

export const useSessionCheck = (checkSession) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      checkSession();
    }, 10 * 60 * 1000); // 10 min

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSession]);

  // Kiểm tra session khi user focus vào tab
  useEffect(() => {
    const handleFocus = () => {
      checkSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkSession]);

  // Kiểm tra session khi user tương tác với trang
  useEffect(() => {
    const handleUserActivity = () => {
      checkSession();
    };

    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    
    // Throttle để tránh gọi quá nhiều
    let lastCheck = 0;
    const throttledCheck = () => {
      const now = Date.now();
      if (now - lastCheck > 30000) { // 30s
        lastCheck = now;
        handleUserActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledCheck);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledCheck);
      });
    };
  }, [checkSession]);
};