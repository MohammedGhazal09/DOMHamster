export interface HamsterMarkProps {
  readonly decorative?: boolean;
  readonly className?: string;
}

export function HamsterMark({ decorative = false, className }: HamsterMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'DOMHamster hamster mascot'}
      focusable="false"
    >
      <circle cx="14" cy="12" r="8" fill="#c9885b" stroke="#6b3f24" />
      <circle cx="34" cy="12" r="8" fill="#c9885b" stroke="#6b3f24" />
      <circle cx="24" cy="25" r="19" fill="#d9a06d" stroke="#6b3f24" strokeWidth="1.5" />
      <ellipse cx="24" cy="30" rx="12" ry="10" fill="#f2d2af" />
      <circle cx="17" cy="22" r="2" fill="#17212b" />
      <circle cx="31" cy="22" r="2" fill="#17212b" />
      <path d="M24 27l-3 3h6z" fill="#6b3f24" />
      <path d="M17 32q4 6 7 0q3 6 7 0" fill="none" stroke="#6b3f24" />
    </svg>
  );
}
