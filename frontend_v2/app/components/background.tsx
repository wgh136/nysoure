import { AnimatePresence, motion } from "framer-motion";
import { useConfig } from "~/hook/config";
import { createContext, useContext, useState } from "react";
import { network } from "~/network/network";
import { useLocation } from "react-router";

const BackgroundContext = createContext<(arg0: number | null) => void>(() => { });

export function Background({ children }: { children: React.ReactNode }) {
  const config = useConfig();
  const location = useLocation(); 

  const [background, setBackground] = useState<number | null>(() => {
    const regex = /^\/resources\/(\d+)$/;
    const match = regex.test(location.pathname);
    return match ? null : config.background;
  });

  return <BackgroundContext.Provider value={setBackground}>
    <div
      className="background-wrapper"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -2,
        opacity: 0.6,
      }}
    >
      {
        background && (
          <AnimatePresence mode="wait">
            <motion.img
              key={background}
              src={network.getImageUrl(background)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute w-full h-full object-cover"
            />
          </AnimatePresence>
        )
      }
    </div>
    {children}
  </BackgroundContext.Provider>
}

export function useSetBackground() {
  return useContext(BackgroundContext);
}