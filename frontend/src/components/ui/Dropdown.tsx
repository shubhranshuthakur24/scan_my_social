'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import Link from 'next/link';

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
  close: () => void;
  disabled?: boolean;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

export function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a <Dropdown> provider');
  }
  return context;
}

export interface DropdownProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className = '',
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (nextState: boolean | ((prev: boolean) => boolean)) => {
      if (disabled) return;
      const resolved = typeof nextState === 'function' ? nextState(isOpen) : nextState;
      if (!isControlled) {
        setUncontrolledOpen(resolved);
      }
      onOpenChange?.(resolved);
    },
    [disabled, isControlled, isOpen, onOpenChange]
  );

  const toggle = useCallback(() => {
    handleOpenChange((prev) => !prev);
  }, [handleOpenChange]);

  const close = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen: handleOpenChange as any,
        toggle,
        close,
        disabled,
      }}
    >
      <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// ----------------------------------------------------------------------
// Trigger
// ----------------------------------------------------------------------

export interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export function DropdownTrigger({ children, className = '', asChild = false }: DropdownTriggerProps) {
  const { isOpen, toggle, disabled } = useDropdown();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        toggle();
      },
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      'aria-disabled': disabled,
    });
  }

  return (
    <div
      onClick={disabled ? undefined : toggle}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-disabled={disabled}
      className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------

export interface DropdownContentProps {
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: 'auto' | 'w-44' | 'w-48' | 'w-56' | 'w-64' | 'w-72' | 'w-80' | string;
  className?: string;
}

export function DropdownContent({
  children,
  align = 'right',
  width = 'w-56',
  className = '',
}: DropdownContentProps) {
  const { isOpen } = useDropdown();

  if (!isOpen) return null;

  const alignStyles = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align];

  return (
    <div
      role="menu"
      className={`absolute z-50 mt-2 ${alignStyles} ${width} rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100 ${className}`}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------
// Item
// ----------------------------------------------------------------------

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  icon?: React.ElementType;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  href,
  icon: Icon,
  selected = false,
  danger = false,
  disabled = false,
  closeOnClick = true,
  className = '',
}: DropdownItemProps) {
  const { close } = useDropdown();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    if (closeOnClick) {
      close();
    }
  };

  const baseStyles =
    'group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left';

  const stateStyles = disabled
    ? 'text-slate-400 opacity-50 cursor-not-allowed'
    : danger
    ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
    : selected
    ? 'bg-primary-50 text-primary-700 font-black cursor-pointer'
    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer';

  const content = (
    <>
      {Icon && (
        <Icon
          size={15}
          className={`shrink-0 transition-colors ${
            disabled
              ? 'text-slate-300'
              : danger
              ? 'text-rose-500'
              : selected
              ? 'text-primary-600'
              : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      )}
      <div className="flex-1 min-w-0">{children}</div>
      {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />}
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        onClick={handleClick}
        role="menuitem"
        className={`${baseStyles} ${stateStyles} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      role="menuitem"
      className={`${baseStyles} ${stateStyles} ${className}`}
    >
      {content}
    </button>
  );
}

// ----------------------------------------------------------------------
// Header & Divider
// ----------------------------------------------------------------------

export function DropdownHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider select-none ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownDivider({ className = '' }: { className?: string }) {
  return <div className={`my-1 border-t border-slate-100 ${className}`} role="separator" />;
}

// ----------------------------------------------------------------------
// Compound Component Export
// ----------------------------------------------------------------------

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Header: DropdownHeader,
  Divider: DropdownDivider,
});

export default Dropdown;
