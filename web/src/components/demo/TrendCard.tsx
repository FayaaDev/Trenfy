import { formatDistanceToNow } from 'date-fns';
import { CameraOff } from 'lucide-react';
import type { Trend } from '@/api/types';
import { Badge } from '@/components/ui/badge';

interface TrendCardProps {
  trend: Trend;
}

function PlatformBadge({ platform }: { platform: string }) {
  const label = platform === 'youtube' ? 'YouTube' : 'X';
  return (
    <Badge variant="secondary" className="capitalize">
      {label}
    </Badge>
  );
}

function formatMetric(value: number, type: string): string {
  return `${value.toLocaleString()} ${type}`;
}

function openSource(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TrendCard({ trend }: TrendCardProps): JSX.Element {
  const hasThumbnail = Boolean(trend.thumbnail_url);
  const thumbnailAlt = trend.title
    ? `${trend.title} thumbnail`
    : 'No thumbnail available';

  return (
    <article
      aria-label={trend.title}
      className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => openSource(trend.url)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSource(trend.url);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Thumbnail */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        {hasThumbnail ? (
          <img
            src={trend.thumbnail_url!}
            alt={thumbnailAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200">
            <CameraOff className="h-10 w-10 text-slate-400" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {/* Platform badge (top-right of body) */}
        <div className="flex justify-end">
          <PlatformBadge platform={trend.platform} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg text-slate-900 line-clamp-2">
          {trend.title}
        </h3>

        {/* ar_translation when present */}
        {trend.ar_translation && (
          <p className="text-sm text-slate-500 italic line-clamp-2">
            {trend.ar_translation}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="capitalize">{trend.category}</span>
          <span aria-hidden="true">·</span>
          <span>{formatMetric(trend.metric_value, trend.metric_type)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {formatDistanceToNow(new Date(trend.published_date), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Open source link */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openSource(trend.url);
          }}
          className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          aria-label={`Open source for ${trend.title}`}
        >
          Open source →
        </button>
      </div>
    </article>
  );
}
