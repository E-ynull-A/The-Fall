import { tr } from '../../i18n/i18n';
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'grave';
}

/** Royal-document style dialog. Esc and the backdrop close it when `onClose` is given. */
export function Modal({ title, subtitle, onClose, children, footer, tone = 'default' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className={`modal modal--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={tr(title)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 className="modal__title">{tr(title)}</h2>
          {subtitle && <p className="modal__subtitle">{tr(subtitle)}</p>}
          {onClose && (
            <button className="icon-btn modal__close" onClick={onClose} aria-label={tr('Close')}>
              ×
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
