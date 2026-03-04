import SkeletonBlock from '@/components/SkeletonBlock';

export default function ChallengeCardSkeleton({ compact = false }) {
  return (
    <div className="glass challenge-card skeleton-card">
      <div className="stack" style={{ gap: 14 }}>
        <div className="row-wrap">
          <SkeletonBlock height={24} width={compact ? '42%' : '36%'} />
          <SkeletonBlock height={24} width="88px" />
          <SkeletonBlock height={24} width="92px" />
        </div>

        <SkeletonBlock height={16} width="92%" />
        <SkeletonBlock height={16} width="76%" />

        <div className="row-wrap">
          <SkeletonBlock height={30} width="90px" />
          <SkeletonBlock height={30} width="100px" />
          <SkeletonBlock height={30} width="118px" />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <SkeletonBlock height={46} width="100%" />
          <SkeletonBlock height={46} width="64px" />
        </div>
      </div>
    </div>
  );
}
