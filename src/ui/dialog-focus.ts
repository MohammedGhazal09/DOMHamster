import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalFocusOptions {
  readonly initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly returnFocusId?: string | undefined;
  readonly onEscape?: (() => void) | undefined;
  readonly active?: boolean | undefined;
}

function focusableElements(container: HTMLElement): readonly HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
  );
}

export function useModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  options: ModalFocusOptions,
): void {
  const onEscapeRef = useRef(options.onEscape);

  useEffect(() => {
    onEscapeRef.current = options.onEscape;
  }, [options.onEscape]);

  useEffect(() => {
    if (options.active === false || typeof document === 'undefined') return undefined;
    const container = containerRef.current;
    if (container === null) return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnFocusId = options.returnFocusId;

    const focusInitial = () => {
      const initial = options.initialFocusRef?.current;
      if (initial !== null && initial !== undefined) {
        initial.focus();
        return;
      }
      focusableElements(container)[0]?.focus();
    };

    queueMicrotask(() => {
      if (container.isConnected) focusInitial();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscapeRef.current !== undefined) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = focusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables.at(-1);
      if (first === undefined || last === undefined) return;
      const active = document.activeElement;
      const activeIndex = active instanceof HTMLElement ? focusables.indexOf(active) : -1;

      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex < 0 || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.setTimeout(() => {
        const requestedReturn =
          returnFocusId === undefined ? null : document.getElementById(returnFocusId);
        if (requestedReturn instanceof HTMLElement) {
          requestedReturn.focus();
        } else if (previouslyFocused?.isConnected === true) {
          previouslyFocused.focus();
        }
      }, 0);
    };
  }, [containerRef, options.active, options.initialFocusRef, options.returnFocusId]);
}
