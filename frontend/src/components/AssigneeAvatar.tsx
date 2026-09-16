// Mockups render avatars as filled circles with a per-person color and
// white initial — a deliberate, scoped exception to the "no rounded
// corners" rule (same pattern as the board's drag-shadow exception).
const PALETTE = ["#5B6B85", "#1C2B4A", "#2C4A7C", "#7C93B3", "#B3352B"];

function colorForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const SIZE_CLASSES = {
  sm: "h-[22px] w-[22px] text-[10px]",
  md: "h-[26px] w-[26px] text-[11px]",
  lg: "h-7 w-7 text-[11px]",
  row: "h-[34px] w-[34px] text-[13px] sm:h-[38px] sm:w-[38px] sm:text-sm",
  profile: "h-[52px] w-[52px] text-xl sm:h-16 sm:w-16 sm:text-2xl",
};

interface AssigneeAvatarProps {
  username: string | null;
  size?: keyof typeof SIZE_CLASSES;
}

export function AssigneeAvatar({ username, size = "sm" }: AssigneeAvatarProps) {
  if (!username) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed border-rule font-body text-ink-soft ${SIZE_CLASSES[size]}`}
      >
        —
      </span>
    );
  }
  return (
    <span
      title={username}
      style={{ backgroundColor: colorForUsername(username) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-body font-semibold text-paper ${SIZE_CLASSES[size]}`}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
