import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface HeaderActionContextValue {
  headerAction: ReactNode | null;
  setHeaderAction: (action: ReactNode | null) => void;
}

const HeaderActionContext = createContext<HeaderActionContextValue>({
  headerAction: null,
  setHeaderAction: () => {},
});

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [headerAction, setHeaderAction] = useState<ReactNode | null>(null);
  return (
    <HeaderActionContext.Provider value={{ headerAction, setHeaderAction }}>
      {children}
    </HeaderActionContext.Provider>
  );
}

export function useHeaderAction() {
  return useContext(HeaderActionContext);
}

/**
 * Lets a page register its primary "create" action so the shell header
 * (MobileHeader / TopBar) can render it in the top bar. The page keeps
 * ownership of the button's onClick / sheet state.
 */
export function useRegisterHeaderAction(action: ReactNode | null) {
  const { setHeaderAction } = useHeaderAction();
  const last = useRef<ReactNode | null>(null);
  useEffect(() => {
    if (action === last.current) return;
    last.current = action;
    setHeaderAction(action);
    return () => {
      if (last.current === action) {
        last.current = null;
        setHeaderAction(null);
      }
    };
  }, [action, setHeaderAction]);
}
