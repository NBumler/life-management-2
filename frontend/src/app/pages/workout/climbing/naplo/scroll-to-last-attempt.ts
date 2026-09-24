import { ElementRef, Injector, afterNextRender } from '@angular/core';

/**
 * backlog/120 — after "Új kísérlet" (top or bottom button) the freshly appended attempt card is
 * scrolled into view once it has rendered, so a long session's list never has to be scrolled by hand.
 */
export function scrollToLastAttempt(host: ElementRef<HTMLElement>, injector: Injector): void {
  afterNextRender(
    () => {
      const cards = host.nativeElement.querySelectorAll<HTMLElement>('.attempt-card');
      cards[cards.length - 1]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    },
    { injector },
  );
}
