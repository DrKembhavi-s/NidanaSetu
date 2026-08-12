"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden text-sm border border-brand-700 text-brand-700 rounded-md px-3 py-2 hover:bg-brand-50 whitespace-nowrap"
    >
      Print / Save as PDF
    </button>
  );
}
