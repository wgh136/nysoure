import { ReactNode } from "react";

export default function Button({ children, onClick, className, disabled, isLoading }: { children: ReactNode, onClick?: () => void, className?: string, disabled?: boolean, isLoading?: boolean }) {
  return <button
    className={`btn ${className} ${disabled ? "btn-disabled" : ""} h-9`}
    onClick={onClick}
    disabled={disabled}
  >
    {isLoading && <span className="loading loading-spinner loading-sm mr-2"></span>}
    <span className="text-sm">
        {children}
    </span>
  </button>;
}