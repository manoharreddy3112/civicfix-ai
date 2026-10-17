import { categoryStyle } from '../lib/constants.js';
import CategoryIcon from './CategoryIcon.jsx';

/** Coloured chip showing the complaint category. */
export default function CategoryBadge({ category, withIcon = true, size = 'md' }) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`badge ${categoryStyle(category)} ${sizing}`}>
      {withIcon && <CategoryIcon category={category} className="h-3.5 w-3.5" />}
      {category}
    </span>
  );
}
