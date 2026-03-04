import SkeletonBlock from '@/components/SkeletonBlock';

export default function TableSkeleton({ rows = 4, cols = 5 }) {
  return (
    <div className="glass card table-wrap skeleton-table-wrap">
      <div className="stack" style={{ gap: 14 }}>
        <SkeletonBlock height={26} width="34%" />
        <div className="skeleton-table-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(90px, 1fr))` }}>
          {Array.from({ length: cols }).map((_, index) => (
            <SkeletonBlock key={`head-${index}`} height={18} width="72%" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="skeleton-table-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(90px, 1fr))` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <SkeletonBlock key={`${rowIndex}-${colIndex}`} height={20} width={`${60 + (colIndex * 6)}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
