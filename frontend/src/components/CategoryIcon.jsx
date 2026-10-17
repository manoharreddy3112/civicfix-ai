import {
  CircleDashed,
  Droplets,
  HelpCircle,
  Lightbulb,
  TrafficCone,
  Trash2,
} from 'lucide-react';

const ICONS = {
  Pothole: CircleDashed,
  Garbage: Trash2,
  'Water Leakage': Droplets,
  'Broken Streetlight': Lightbulb,
  'Damaged Road': TrafficCone,
  Other: HelpCircle,
};

/** Maps a complaint category to a lucide icon. */
export default function CategoryIcon({ category, className = 'h-5 w-5' }) {
  const Icon = ICONS[category] || HelpCircle;
  return <Icon className={className} aria-hidden="true" />;
}

export { ICONS as CATEGORY_ICONS };
