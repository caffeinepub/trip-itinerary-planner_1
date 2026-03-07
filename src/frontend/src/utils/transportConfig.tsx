import {
  Bus,
  Car,
  CarTaxiFront,
  Footprints,
  HelpCircle,
  Plane,
  Ship,
  Train,
} from "lucide-react";
import type { ReactNode } from "react";

export interface TransportOption {
  value: string;
  label: string;
  icon: ReactNode;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
}

export const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    value: "Flight",
    label: "Flight",
    icon: <Plane className="w-3.5 h-3.5" />,
    color: "bg-blue-100",
    textColor: "text-blue-800",
  },
  {
    value: "Train",
    label: "Train",
    icon: <Train className="w-3.5 h-3.5" />,
    color: "bg-purple-100",
    textColor: "text-purple-800",
  },
  {
    value: "Bus",
    label: "Bus",
    icon: <Bus className="w-3.5 h-3.5" />,
    color: "bg-green-100",
    textColor: "text-green-800",
  },
  {
    value: "Car",
    label: "Car",
    icon: <Car className="w-3.5 h-3.5" />,
    color: "bg-orange-100",
    textColor: "text-orange-800",
  },
  {
    value: "Taxi",
    label: "Taxi",
    icon: <CarTaxiFront className="w-3.5 h-3.5" />,
    color: "bg-yellow-100",
    textColor: "text-yellow-800",
  },
  {
    value: "Walk",
    label: "Walk",
    icon: <Footprints className="w-3.5 h-3.5" />,
    color: "bg-emerald-100",
    textColor: "text-emerald-800",
  },
  {
    value: "Boat",
    label: "Boat",
    icon: <Ship className="w-3.5 h-3.5" />,
    color: "bg-cyan-100",
    textColor: "text-cyan-800",
  },
  {
    value: "Other",
    label: "Other",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    color: "bg-gray-100",
    textColor: "text-gray-700",
  },
];

export function getTransportOption(value: string): TransportOption {
  return (
    TRANSPORT_OPTIONS.find((t) => t.value === value) ?? TRANSPORT_OPTIONS[7]
  );
}
