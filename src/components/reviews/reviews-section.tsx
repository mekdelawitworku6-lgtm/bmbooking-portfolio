'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/ethiopianDate';
import { MedText } from '@/components/ui/med-text';
import { MedCard } from '@/components/ui/med-card';
import {
  Star,
  MessageSquare,
  Loader2,
  Quote,
  Building2,
  ChevronDown,
  UserRound,
} from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  hospitalResponse: string | null;
  hospitalRespondedAt: string | null;
  createdAt: string;
  patient: { id: number; fullName: string | null } | null;
  doctor?: { id: number; fullName: string | null } | null;
  hospital?: { id: number; name: string | null } | null;
}

interface Summary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

interface ReviewsSectionProps {
  target: 'doctor' | 'hospital';
  targetId: number;
  title?: string;
}

const emptySummary: Summary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= value ? 'text-star fill-star' : 'text-border'}
        />
      ))}
    </div>
  );
}

function RatingBars({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = summary.distribution?.[String(star)] || 0;
        const percent =
          summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-3 text-[11px] font-medium text-text-secondary">{star}</span>
            <Star size={10} className="text-star fill-star flex-shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-star transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-6 text-right text-[10px] text-muted">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewsSection({ target, targetId, title }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sort, setSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (page: number, append = false) => {
      if (!targetId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params: Record<string, string | number> = {
          page,
          limit: 5,
          sort,
        };
        if (ratingFilter !== 'All') params.rating = ratingFilter;

        const response = await api.get(`/reviews/${target}/${targetId}`, { params });
        const nextReviews = response.data.reviews || [];
        setReviews((current) =>
          append ? [...current, ...nextReviews] : nextReviews,
        );
        setSummary(response.data.summary || emptySummary);
        setPagination({
          page: response.data.pagination?.page || page,
          totalPages: response.data.pagination?.totalPages || 1,
          total: response.data.pagination?.total || nextReviews.length,
        });
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [target, targetId, sort, ratingFilter],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const average =
    summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0';

  return (
    <MedCard className="mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={17} className="text-primary" />
          <MedText variant="h2" as="h3">
            {title || 'Ratings & Reviews'}
          </MedText>
        </div>
        <span className="text-[11px] text-muted">
          {summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-[10px] bg-error-bg border border-error/20 px-3 py-2.5 text-[12px] text-error">
          {error}
        </div>
      ) : summary.totalReviews === 0 ? (
        <div className="text-center py-8">
          <Star size={30} className="mx-auto text-border mb-2" />
          <MedText variant="body" className="text-text-secondary text-[14px]">
            No reviews yet
          </MedText>
          <MedText variant="metadata" className="text-muted mt-1">
            Be the first to share your experience.
          </MedText>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 pb-4 mb-4 border-b border-border">
            <div className="sm:w-[150px] text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[34px] font-bold text-text leading-none">{average}</span>
                <div>
                  <Stars value={Math.round(summary.averageRating)} />
                  <div className="text-[10px] text-muted mt-0.5">
                    Based on {summary.totalReviews} reviews
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <RatingBars summary={summary} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {['All', '5', '4', '3', '2', '1'].map((option) => (
              <button
                key={option}
                onClick={() => setRatingFilter(option)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  ratingFilter === option
                    ? 'bg-star text-white'
                    : 'bg-background border border-border text-text-secondary'
                }`}
              >
                {option === 'All' ? 'All' : `${option}★`}
              </button>
            ))}
            <div className="flex-1" />
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as 'recent' | 'highest' | 'lowest')
              }
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-background border border-border text-text-secondary outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <MedText variant="metadata" className="text-muted text-center py-4 block">
                No reviews match this rating.
              </MedText>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-[12px] bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserRound size={13} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-text truncate">
                          {review.patient?.fullName || 'Patient'}
                        </div>
                        <div className="text-[10px] text-muted">
                          {formatDate(new Date(review.createdAt), 'medium')}
                        </div>
                      </div>
                    </div>
                    <Stars value={review.rating} size={13} />
                  </div>

                  {review.comment && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <Quote size={12} className="text-muted mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] leading-relaxed text-text-secondary">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {review.hospitalResponse && (
                    <div className="mt-2 rounded-[8px] border border-primary/15 bg-primary/5 px-2.5 py-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Building2 size={10} className="text-primary" />
                        <span className="text-[10px] font-semibold text-primary">
                          {review.hospital?.name || 'Hospital'} response
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-text-secondary">
                        {review.hospitalResponse}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {pagination.page < pagination.totalPages && (
            <button
              onClick={() => load(pagination.page + 1, true)}
              disabled={loadingMore}
              className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-[10px] border border-border text-[12px] font-semibold text-text-secondary hover:bg-foreground/5 disabled:opacity-60"
            >
              {loadingMore ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              Show more reviews
            </button>
          )}
        </>
      )}
    </MedCard>
  );
}
