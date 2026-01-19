import { AnimatePresence, motion } from "framer-motion";
import { useConfig } from "~/hook/config";
import { createContext, useState } from "react";
import { network } from "~/network/network";

const BackgroundContext = createContext<(arg0: number) => void>(() => { });

export function Background({ children }: { children: React.ReactNode }) {
  const config = useConfig();

  const [background, setBackground] = useState<number | null>(config.background);

  if (!background) {
    return <></>
  }

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
        opacity: 0.3,
      }}
    >
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
    </div>
    {children}
  </BackgroundContext.Provider>
}