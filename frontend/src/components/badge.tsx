import {ReactNode} from "react";

export default function Badge({children, className, onClick }: { children: ReactNode, className?: string, onClick?: () => void }) {
  return <span className={`badge ${!className?.includes("badge-") && "badge-primary"} ${className}`} onClick={onClick}>{children}</span>
}

export function BadgeAccent({children, className, onClick }: { children: ReactNode, className?: string, onClick?: () => void }) {
  return <span className={`badge badge-accent text-sm ${className}`} onClick={onClick}>{children}</span>
}