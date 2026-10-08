import React from 'react';

/**
 * F9 — print isolation for the ID card / TC modals.
 *
 * When the two document modals print, everything in the app is hidden except
 * the element carrying `doc-print-area`, which is pinned to the page so the
 * surrounding dark modal chrome never reaches paper. Buttons and other chrome
 * opt out with `doc-no-print`.
 */
export const DOCUMENT_PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .doc-print-area, .doc-print-area * { visibility: visible !important; }
  .doc-print-area {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    z-index: 9999 !important;
  }
  .doc-no-print { display: none !important; }
  @page { margin: 12mm; }
}
`;

export const DocumentPrintStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: DOCUMENT_PRINT_CSS }} />
);