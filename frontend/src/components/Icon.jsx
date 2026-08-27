function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className = ""
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true"
  };

  const icons = {
    pump: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M10 7h4" />
        <path d="M10 17h4" />
      </>
    ),

    wifi: (
      <>
        <path d="M2 8.5C7.5 3.5 16.5 3.5 22 8.5" />
        <path d="M5 12c4-3.5 10-3.5 14 0" />
        <path d="M8.5 15.5c2-1.7 5-1.7 7 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      </>
    ),

    power: (
      <>
        <path d="M12 2v10" />
        <path d="M6.5 5.5a8 8 0 1 0 11 0" />
      </>
    ),

    microphone: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        <path d="M8 21h8" />
      </>
    ),

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M7 15l3-4 3 2 5-6" />
      </>
    ),

    droplet: (
      <path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5Z" />
    ),

    voltage: (
      <path d="M13 2L5 13h6l-1 9 8-11h-6l1-9Z" />
    ),

    current: (
      <>
        <path d="M8 4v16M16 4v16" />
        <path d="M5 8h6M13 16h6" />
      </>
    ),

    pressure: (
      <>
        <path d="M4 14a8 8 0 0 1 16 0" />
        <path d="M12 14l4-5" />
        <path d="M6 18h12" />
      </>
    ),

    temperature: (
      <>
        <path d="M12 3a2 2 0 0 0-2 2v8.2a5 5 0 1 0 4 0V5a2 2 0 0 0-2-2Z" />
        <path d="M12 10v6" />
      </>
    ),

    settings: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4 12H2M22 12h-2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 4V2M12 22v-2" />
      </>
    ),

    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),

    save: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M8 3v6h8V3" />
        <path d="M8 14h8v7H8z" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <circle cx="12" cy="7.5" r=".7" fill="currentColor" stroke="none" />
      </>
    ),


  };

  return (
    <svg {...common}>
      {icons[name] || null}
    </svg>
  );
}

export default Icon;
