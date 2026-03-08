import {
  BedDouble,
  BookOpen,
  HelpCircle,
  Landmark,
  PlaneTakeoff,
  Ship,
  ShoppingBag,
  TreePine,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";

export interface VenueOption {
  value: string;
  label: string;
  icon: ReactNode;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
}

export const VENUE_OPTIONS: VenueOption[] = [
  {
    value: "Hotel",
    label: "Hotel",
    icon: <BedDouble className="w-5 h-5" />,
    color: "bg-blue-100",
    textColor: "text-blue-800",
  },
  {
    value: "Restaurant",
    label: "Restaurant",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    color: "bg-orange-100",
    textColor: "text-orange-800",
  },
  {
    value: "Ferry",
    label: "Ferry",
    icon: <Ship className="w-5 h-5" />,
    color: "bg-cyan-100",
    textColor: "text-cyan-800",
  },
  {
    value: "Attraction",
    label: "Attraction",
    icon: <Landmark className="w-5 h-5" />,
    color: "bg-purple-100",
    textColor: "text-purple-800",
  },
  {
    value: "Beach",
    label: "Beach",
    icon: <Waves className="w-5 h-5" />,
    color: "bg-sky-100",
    textColor: "text-sky-800",
  },
  {
    value: "Museum",
    label: "Museum",
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-amber-100",
    textColor: "text-amber-800",
  },
  {
    value: "Park",
    label: "Park",
    icon: <TreePine className="w-5 h-5" />,
    color: "bg-green-100",
    textColor: "text-green-800",
  },
  {
    value: "Shopping",
    label: "Shopping",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "bg-pink-100",
    textColor: "text-pink-800",
  },
  {
    value: "Airport",
    label: "Airport",
    icon: <PlaneTakeoff className="w-5 h-5" />,
    color: "bg-indigo-100",
    textColor: "text-indigo-800",
  },
  {
    value: "Other",
    label: "Other",
    icon: <HelpCircle className="w-5 h-5" />,
    color: "bg-gray-100",
    textColor: "text-gray-700",
  },
];

export function getVenueOption(value: string): VenueOption | undefined {
  if (!value) return undefined;
  return VENUE_OPTIONS.find((v) => v.value === value);
}
