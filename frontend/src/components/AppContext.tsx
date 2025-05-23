import {createContext, ReactNode, useContext} from "react";

export default function AppContext({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <context.Provider value={new Map<string, any>()}>
      {children}
    </context.Provider>
  );
}

const context = createContext<Map<string, any>>(new Map<string, any>());

export function useAppContext() {
  return useContext(context)
}