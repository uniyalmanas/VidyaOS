import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface NavigateOptions {
  replace?: boolean;
}

interface RouterContextType {
  currentPath: string;
  navigate: (toPath: string, options?: NavigateOptions) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigate = useCallback((toPath: string, options?: NavigateOptions) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== toPath) {
        if (options?.replace) {
          window.history.replaceState({}, '', toPath);
        } else {
          window.history.pushState({}, '', toPath);
        }
        setCurrentPath(toPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
