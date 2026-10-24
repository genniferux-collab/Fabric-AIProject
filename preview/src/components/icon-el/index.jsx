import { Icon } from "../../../assets/shared/icon.jsx";

// Public chrome uses local filled glyphs, including when the icon service is offline.
const filled = {
  menu: 'M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z',
  house: 'M12 2 1.8 10.5l1.4 1.6L5 10.6V22h14V10.6l1.8 1.5 1.4-1.6zM10 14h4v8h-4z',
  monitor: 'M3 3h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-8v3h5v2H6v-2h5v-3H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  'layout-dashboard': 'M3 3h8v8H3zm10 0h8v5h-8zm0 7h8v11h-8zM3 13h8v8H3z',
  network: 'M8 2h8v6h-3v3h7v5h3v6h-8v-6h3v-3h-5v3h3v6H8v-6h3v-3H6v3h3v6H1v-6h3v-5h7V8H8z',
  sparkles: 'm14 1 3 7.7 7 3.3-7 3.3L14 23l-3-7.7L4 12l7-3.3zM4 1l1.2 2.8L8 5 5.2 6.2 4 9 2.8 6.2 0 5l2.8-1.2z',
  'circle-question-mark': 'M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zm-1 14h2v-1c0-.6.5-.9 1.3-1.4 1.1-.7 2.2-1.5 2.2-3.4 0-2.3-1.8-3.7-4.3-3.7-2.6 0-4.2 1.6-4.3 3.8h2.2c.1-1.1.8-1.8 2-1.8s2 .6 2 1.6c0 .9-.6 1.3-1.5 1.9-1 .6-1.6 1.2-1.6 2.6zm0 2v2h2v-2z',
  sun: 'M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4zM3 1.6l2.8 2.8-1.4 1.4L1.6 3zm15.2 16.6 1.4-1.4 2.8 2.8-1.4 1.4zM21 1.6 22.4 3l-2.8 2.8-1.4-1.4zM4.4 18.2l1.4 1.4L3 22.4 1.6 21z',
  'arrow-left': 'M10.6 3.3 2 12l8.6 8.7 1.5-1.4L5.8 13H22v-2H5.8l6.3-6.3z',
  'arrow-up': 'm3.3 10.6 1.4 1.5L11 5.8V22h2V5.8l6.3 6.3 1.4-1.5L12 2z',
  ellipsis: 'M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  plus: 'M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8z',
  x: 'm5.4 4 6.6 6.6L18.6 4 20 5.4 13.4 12l6.6 6.6-1.4 1.4-6.6-6.6L5.4 20 4 18.6l6.6-6.6L4 5.4z',
  'chevron-up': 'm12 6.6 8.7 8.7-1.4 1.4-7.3-7.3-7.3 7.3-1.4-1.4z',
  'chevron-down': 'm4.7 7.3 7.3 7.3 7.3-7.3 1.4 1.4-8.7 8.7-8.7-8.7z',
  'layout-panel-top': 'M2 3h20v5H2zm0 7h6v11H2zm8 0h12v11H10z',
  'file-text': 'M4 2h11l5 5v15H4zm10 2v5h5zM7 12v2h10v-2zm0 5v2h10v-2z',
  server: 'M2 2h20v9H2zm3 3v3h3V5zM2 13h20v9H2zm3 3v3h3v-3z',
  map: 'M2 5 8 2v17l-6 3zm8-3 4 3v17l-4-3zm6 3 6-3v17l-6 3z',
  upload: 'M3 16h2v4h14v-4h2v6H3zm8 0V7.8L7.4 11.4 6 10l6-6 6 6-1.4 1.4L13 7.8V16z',
  mic: 'M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zM5 10h2v2a5 5 0 0 0 10 0v-2h2v2a7 7 0 0 1-6 6.9V21h4v2H7v-2h4v-2.1A7 7 0 0 1 5 12z',
  send: 'M22 2 15.3 22l-4.4-8.9L2 8.7zM18.6 5.4l-8.4 5.1 1.7.8.8 1.7z',
  'locate-fixed': 'M11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4zM12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
};

export default function Ic({ icon, variant = "lined", className = "ic", style, title, onClick }) {
  if (variant === "filled" && filled[icon]) return (
    <svg className={className + " ic-filled"} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ ...style, fill: "currentColor", stroke: "none" }} onClick={onClick}>
      {title && <title>{title}</title>}<path fillRule="evenodd" d={filled[icon]} />
    </svg>
  );
  return <Icon name={icon} className={className} strokeWidth={1.6} style={style} title={title} onClick={onClick} />;
}
