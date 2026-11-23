'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/ethiopianDate';
import { MedText } from '@/components/ui/med-text';
import { MedCard } from '@/components/ui/med-card';
import {
  Star,
  MessageSquare,
  Loader2,
  Quote,
  Send,
  X,
  Stethoscope,
  UserRound,
  Building2,
  CornerDownRight,
  AlertTriangle,
} from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  hospitalResponse: string | null;
  hospitalRespondedAt: string | null;
  createdAt: string;
  patient: { id: number; fullName: string | null; phone?: string | null };
  doctor: { id: number; fullName: string | null; specialization?: string | null } | null;
  appointment: { id: number; dateTime: string } | null;
}

interface Summary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

const emptySummary: Summary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
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
            <span className="w-7 text-right text-[10px] text-muted">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HospitalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recent');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [responding, setResponding] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (page = 1, append = false) => {
      setLoading(true);
      setError('');
      try {
        const params: Record<string, string | number> = {
          page,
          limit: 10,
          sort,
        };
        if (ratingFilter !== 'All') params.rating = ratingFilter;
        if (search.trim()) params.search = search.trim();

        const response = await api.get('/hospital/reviews', { params });
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
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load reviews'));
      } finally {
        setLoading(false);
      }
    },
    [sort, ratingFilter, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openResponse = (review: Review) => {
    setResponding(review);
    setResponseText(review.hospitalResponse || '');
  };

  const saveResponse = async () => {
    if (!responding || !responseText.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/hospital/reviews/${responding.id}/respond`, {
        response: responseText.trim(),
      });
      setResponding(null);
      setResponseText('');
      await load(1);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save response'));
    } finally {
      setSaving(false);
    }
  };

  const average =
    summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0';
  const responseRate =
    reviews.length > 0
      ? Math.round(
          (reviews.filter((review) => review.hospitalResponse).length /
            reviews.length) *
            100,
        )
      : 0;

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <MedText variant="h2" as="h2" className="text-[20px]">
            Patient Reviews
          </MedText>
          <MedText variant="body" className="text-text-secondary mt-1">
            Monitor patient feedback and respond publicly.
          </MedText>
        </div>
        <div className="flex items-center gap-3 rounded-[12px] bg-surface border border-border px-4 py-2.5">
          <div>
            <div className="text-[22px] font-bold text-text leading-none">{average}</div>
            <div className="mt-1">
              <Stars value={Math.round(summary.averageRating)} size={11} />
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-[16px] font-semibold text-text">
              {summary.totalReviews}
            </div>
            <div className="text-[10px] text-muted">Total reviews</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-[16px] font-semibold text-text">{responseRate}%</div>
            <div className="text-[10px] text-muted">Responded</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-error/20 bg-error-bg px-4 py-3 text-[13px] text-error flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-4">
          <MedCard>
            <MedText variant="body" className="text-[14px] font-semibold text-text mb-3">
              Rating breakdown
            </MedText>
            <RatingBars summary={summary} />
          </MedCard>

          <MedCard>
            <MedText variant="body" className="text-[14px] font-semibold text-text mb-2">
              Filter by rating
            </MedText>
            <div className="flex flex-wrap gap-1.5">
              {['All', '5', '4', '3', '2', '1'].map((option) => (
                <button
                  key={option}
                  onClick={() => setRatingFilter(option)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    ratingFilter === option
                      ? 'bg-star text-white'
                      : 'bg-background border border-border text-text-secondary'
                  }`}
                >
                  {option === 'All' ? 'All' : `${option}★`}
                </button>
              ))}
            </div>

            <MedText variant="body" className="text-[14px] font-semibold text-text mt-4 mb-2">
              Sort
            </MedText>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[12px] text-text-secondary outline-none"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
              <option value="oldest">Oldest first</option>
            </select>
          </MedCard>
        </div>

        <div>
          <div className="mb-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, doctor or comment..."
              className="w-full rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-primary"
            />
          </div>

          {loading && reviews.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <MedCard className="text-center py-12">
              <MessageSquare size={36} className="mx-auto text-border mb-3" />
              <MedText variant="body" className="text-text">
                {summary.totalReviews === 0
                  ? 'No reviews yet'
                  : 'No reviews match these filters'}
              </MedText>
              <MedText variant="metadata" className="text-muted mt-1">
                {summary.totalReviews === 0
                  ? 'Patient reviews will appear here after completed appointments.'
                  : 'Try a different rating, search term or sort order.'}
              </MedText>
            </MedCard>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <MedCard key={review.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserRound size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-text truncate">
                          {review.patient?.fullName || 'Patient'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-muted">
                          {review.doctor?.fullName && (
                            <span className="flex items-center gap-1">
                              <Stethoscope size={10} />
                              {review.doctor.fullName}
                            </span>
                          )}
                          <span>{formatDate(new Date(review.createdAt), 'medium')}</span>
                        </div>
                      </div>
                    </div>
                    <Stars value={review.rating} />
                  </div>

                  {review.comment && (
                    <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-background px-3 py-2.5">
                      <Quote size={12} className="text-muted mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] leading-relaxed text-text-secondary">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {review.hospitalResponse ? (
                    <div className="mt-3 rounded-[10px] border border-primary/15 bg-primary/5 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                          <CornerDownRight size={11} />
                          Your response
                        </span>
                        <button
                          onClick={() => openResponse(review)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-[12px] leading-relaxed text-text-secondary">
                        {review.hospitalResponse}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openResponse(review)}
                      className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <MessageSquare size={12} />
                      Respond to this review
                    </button>
                  )}
                </MedCard>
              ))}

              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => load(pagination.page + 1, true)}
                  disabled={loading}
                  className="w-full py-2.5 rounded-[10px] border border-border text-[12px] font-semibold text-text-secondary hover:bg-foreground/5 disabled:opacity-60"
                >
                  {loading ? 'Loading...' : 'Load more reviews'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {responding && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-surface rounded-t-[20px] sm:rounded-[18px] p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <MedText variant="h2" as="h3">
                  Respond to review
                </MedText>
                <MedText variant="metadata" className="text-muted mt-1">
                  {responding.patient?.fullName || 'Patient'}
                  {responding.doctor?.fullName
                    ? ` · ${responding.doctor.fullName}`
                    : ''}
                </MedText>
              </div>
              <button
                onClick={() => {
                  setResponding(null);
                  setResponseText('');
                }}
                className="p-1.5 rounded-[8px] hover:bg-foreground/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {responding.comment && (
              <div className="mb-4 rounded-[10px] bg-background px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Stars value={responding.rating} size={12} />
                </div>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  {responding.comment}
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-[10px] bg-blue-bg px-3 py-2.5 mb-4">
              <AlertTriangle size={14} className="text-blue mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed text-text-secondary">
                Your response will be visible publicly next to this review.
              </p>
            </div>

            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              Your response
            </label>
            <textarea
              value={responseText}
              onChange={(event) => setResponseText(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Thank the patient or address their concern..."
              className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-[14px] text-text outline-none focus:border-primary resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted">{responseText.length}/1000</span>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Building2 size={11} />
                Public response
              </span>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setResponding(null);
                  setResponseText('');
                }}
                className="flex-1 py-3 rounded-[10px] border border-border text-[13px] font-semibold text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveResponse}
                disabled={saving || !responseText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] bg-primary text-white text-[13px] font-semibold disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Publish response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
