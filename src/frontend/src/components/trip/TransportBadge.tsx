import { getTransportOption } from "../../utils/transportConfig";

interface TransportBadgeProps {
  mode: string;
  size?: "sm" | "md";
}

export function TransportBadge({ mode, size = "md" }: TransportBadgeProps) {
  const option = getTransportOption(mode);
  const sizeClass =
    size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${option.color} ${option.textColor}`}
    >
      {option.icon}
      {option.label}
    </span>
  );
}
