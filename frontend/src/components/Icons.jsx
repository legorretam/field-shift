// Small stroke icons, drawn to match Geologica's weight.

export function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17 17" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m5 10.5 3.2 3L15 6.5" />
    </svg>
  )
}

// A panel edge with an arrow: points left to tuck the panel away, right to bring it back.
export function PanelIcon({ open = true, ...props }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3.5" width="14" height="13" rx="2.5" />
      <path d="M7.5 3.5v13" />
      <path d={open ? 'm13 8-2 2 2 2' : 'm11 8 2 2-2 2'} />
    </svg>
  )
}
