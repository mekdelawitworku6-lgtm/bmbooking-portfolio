'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api/client';
import {
  Star,
  MessageSquare,
  EyeOff,
  Eye,
  Trash2,
  Building2,
  Stethoscope,
  X,
  Loader2,
  AlertTriangle,
  CornerDownRight,
  UserRound,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/ethiopianDate';
import { adminPageStyles } from '@/lib/adminStyles';
import { AdminPageHeader } from '@/components/admin/page-header';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  hospitalResponse: string | null;
  hospitalRespondedAt: string | null;
  isHidden: boolean;
  hiddenReason: string | null;
  createdAt: string;
  patient: { id: number; fullName: string | null; phone: string | null };
  doctor: {
    id: number;
    fullName: string | null;
    specialization: string | null;
  } | null;
  hospital: { id: number; name: string | null; image: string | null } | null;
  appointment: { id: number; dateTime: string; status: string } | null;
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

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sort, setSort] = useState('recent');
  const [hideTarget, setHideTarget] = useState<Review | null>(null);
  const [hiddenReason, setHiddenReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReviews = useCallback(
    async (page = 1, append = false) => {
      setLoading(true);
      setError('');
      try {
        const params: Record<string, string | number> = {
          page,
          limit: 10,
          sort,
        };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (ratingFilter !== 'All') params.rating = ratingFilter;
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const response = await api.get('/admin/reviews', { params });
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
    [statusFilter, ratingFilter, sort, searchTerm],
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchReviews(1), 250);
    return () => clearTimeout(timer);
  }, [fetchReviews]);

  const moderate = async (
    review: Review,
    isHidden: boolean,
    reason?: string,
  ) => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/reviews/${review.id}/moderate`, {
        isHidden,
        hiddenReason: reason,
      });
      setHideTarget(null);
      setHiddenReason('');
      await fetchReviews(1);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update review'));
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async (review: Review) => {
    if (!window.confirm('Delete this review permanently? This cannot be undone.')) {
      return;
    }
    setError('');
    try {
      await api.delete(`/admin/reviews/${review.id}`);
      await fetchReviews(1);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete review'));
    }
  };

  const average =
    summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0';
  const responseCount = reviews.filter((review) => review.hospitalResponse).length;
  const responseRate =
    reviews.length > 0 ? Math.round((responseCount / reviews.length) * 100) : 0;

  return (
    <div style={adminPageStyles.page}>
      <AdminPageHeader
        icon={Star}
        title="Ratings & Reviews"
        subtitle="Moderate patient feedback, hospital responses and platform ratings."
        actions={
          <div style={adminPageStyles.searchWrap}>
            <input
              placeholder="Search patient, doctor, hospital or comment..."
              style={adminPageStyles.searchInput}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-[10px] border border-error/20 bg-error-bg px-4 py-3 text-[13px] text-error flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="paper-card" style={styles.statCard}>
          <Star size={18} className="text-star mb-2" />
          <div style={styles.statValue}>{average}</div>
          <div style={styles.statLabel}>Average rating</div>
        </div>
        <div className="paper-card" style={styles.statCard}>
          <MessageSquare size={18} className="text-blue mb-2" />
          <div style={styles.statValue}>{summary.totalReviews}</div>
          <div style={styles.statLabel}>Total reviews</div>
        </div>
        <div className="paper-card" style={styles.statCard}>
          <Building2 size={18} className="text-success mb-2" />
          <div style={styles.statValue}>{responseRate}%</div>
          <div style={styles.statLabel}>Hospital response rate</div>
        </div>
        <div className="paper-card" style={styles.statCard}>
          <EyeOff size={18} className="text-error mb-2" />
          <div style={styles.statValue}>
            {summary.distribution
              ? reviews.filter((review) => review.isHidden).length
              : 0}
          </div>
          <div style={styles.statLabel}>Hidden on this page</div>
        </div>
      </div>

      <div className="paper-card" style={styles.filterBar}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['all', 'All reviews'],
            ['visible', 'Visible'],
            ['hidden', 'Hidden'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                ...styles.filterPill,
                ...(statusFilter === value ? styles.filterPillActive : {}),
              }}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          {['All', '5', '4', '3', '2', '1'].map((value) => (
            <button
              key={value}
              onClick={() => setRatingFilter(value)}
              style={{
                ...styles.filterPill,
                ...(ratingFilter === value ? styles.ratingPillActive : {}),
              }}
            >
              {value === 'All' ? 'All ratings' : `${value}★`}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          style={styles.select}
        >
          <option value="recent">Most recent</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {loading && reviews.length === 0 ? (
        <div style={styles.loading}>
          <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto mb-2" />
          Loading feedback feed...
        </div>
      ) : reviews.length === 0 ? (
        <div style={styles.empty}>
          {summary.totalReviews === 0
            ? 'No reviews yet.'
            : 'No reviews match the selected filters.'}
        </div>
      ) : (
        <div style={styles.feed}>
          {reviews.map((review) => (
            <div key={review.id} className="paper-card" style={styles.reviewCard}>
              <div style={styles.reviewHeader}>
                <div style={styles.patientInfo}>
                  <div style={styles.avatar}>
                    <UserRound size={16} />
                  </div>
                  <div>
                    <h4 style={styles.patientName}>
                      {review.patient?.fullName || 'Patient'}
                    </h4>
                    <p style={styles.date}>
                      {formatDate(new Date(review.createdAt), 'medium')}
                      {review.patient?.phone ? ` · ${review.patient.phone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.isHidden && (
                    <span style={styles.hiddenBadge}>
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                  <Stars value={review.rating} size={15} />
                </div>
              </div>

              {review.comment ? (
                <div style={styles.reviewBody}>
                  <MessageSquare size={15} color="#9A94A1" style={{ marginTop: 2 }} />
                  <p style={styles.comment}>{review.comment}</p>
                </div>
              ) : (
                <div style={styles.reviewBody}>
                  <p style={{ ...styles.comment, color: '#9A94A1', fontStyle: 'normal' }}>
                    No written comment.
                  </p>
                </div>
              )}

              {review.isHidden && review.hiddenReason && (
                <div style={styles.hiddenReason}>
                  <AlertTriangle size={13} />
                  <span>Hidden reason: {review.hiddenReason}</span>
                </div>
              )}

              {review.hospitalResponse && (
                <div style={styles.responseBox}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CornerDownRight size={11} className="text-primary" />
                    <span className="text-[10px] font-semibold text-primary">
                      {review.hospital?.name || 'Hospital'} response
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    {review.hospitalResponse}
                  </p>
                </div>
              )}

              <div style={styles.reviewFooter}>
                <div className="flex flex-wrap items-center gap-2">
                  {review.doctor && (
                    <span style={styles.targetTag}>
                      <Stethoscope size={11} />
                      {review.doctor.fullName}
                      {review.doctor.specialization
                        ? ` · ${review.doctor.specialization}`
                        : ''}
                    </span>
                  )}
                  {review.hospital && (
                    <span style={styles.targetTag}>
                      <Building2 size={11} />
                      {review.hospital.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {review.isHidden ? (
                    <button
                      onClick={() => moderate(review, false)}
                      disabled={saving}
                      style={styles.publishBtn}
                    >
                      <Eye size={13} /> Publish
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setHideTarget(review);
                        setHiddenReason('');
                      }}
                      disabled={saving}
                      style={styles.hideBtn}
                    >
                      <EyeOff size={13} /> Hide
                    </button>
                  )}
                  <button
                    onClick={() => removeReview(review)}
                    style={styles.deleteBtn}
                    aria-label="Delete review"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pagination.page < pagination.totalPages && (
            <button
              onClick={() => fetchReviews(pagination.page + 1, true)}
              disabled={loading}
              style={styles.loadMore}
            >
              {loading ? 'Loading...' : 'Load more reviews'}
            </button>
          )}
        </div>
      )}

      {hideTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-[16px] p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-text">Hide review</h3>
                <p className="text-[12px] text-text-secondary mt-1">
                  Hidden reviews are excluded from public ratings and listings.
                </p>
              </div>
              <button
                onClick={() => setHideTarget(null)}
                className="p-1.5 rounded-[8px] hover:bg-foreground/5"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              Reason (recommended)
            </label>
            <textarea
              value={hiddenReason}
              onChange={(event) => setHiddenReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Abusive language, spam, personal information..."
              className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-[13px] text-text outline-none focus:border-primary resize-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setHideTarget(null)}
                className="flex-1 py-2.5 rounded-[10px] border border-border text-[12px] font-semibold text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => moderate(hideTarget, true, hiddenReason)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-error text-white text-[12px] font-semibold disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                Hide review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  feed: { display: 'flex', flexDirection: 'column', gap: '14px' },
  reviewCard: { padding: '20px' },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '14px',
  },
  patientInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#F4F9EE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0072BB',
  },
  patientName: { fontSize: '14px', fontWeight: 700, color: '#2A2A2A', margin: 0 },
  date: { fontSize: '11px', color: '#9A94A1', margin: '2px 0 0' },
  reviewBody: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    padding: '12px 14px',
    backgroundColor: '#FAF8FC',
    borderRadius: '10px',
    border: '1px solid #F7F4FB',
  },
  comment: { fontSize: '13px', color: '#3D3A42', lineHeight: 1.6, margin: 0 },
  reviewFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '12px',
    borderTop: '1px solid #F7F4FB',
  },
  targetTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#5F5A66',
    backgroundColor: '#F7F4FB',
    padding: '3px 8px',
    borderRadius: '100px',
  },
  hiddenBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#B42318',
    backgroundColor: '#FEF3F2',
    padding: '2px 7px',
    borderRadius: '100px',
  },
  hiddenReason: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '11px',
    color: '#B42318',
    backgroundColor: '#FEF3F2',
    borderRadius: '8px',
    padding: '8px 10px',
    marginBottom: '12px',
  },
  responseBox: {
    borderRadius: '8px',
    border: '1px solid #DCE7CF',
    backgroundColor: '#F4F9EE',
    padding: '8px 10px',
    marginBottom: '12px',
  },
  hideBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#B42318',
    backgroundColor: '#FEF3F2',
    border: '1px solid #FEE4E2',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
  },
  publishBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#0E8A5F',
    backgroundColor: '#E8F6EF',
    border: '1px solid #D7F0E5',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    color: '#6B6572',
    backgroundColor: 'transparent',
    border: '1px solid #E7E1EC',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  statCard: { padding: '16px' },
  statValue: { fontSize: '22px', fontWeight: 700, color: '#1E1E1E', lineHeight: 1.2 },
  statLabel: { fontSize: '11px', color: '#6B6572', marginTop: '2px' },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '12px 14px',
    marginBottom: '16px',
  },
  filterPill: {
    padding: '5px 10px',
    borderRadius: '100px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#5F5A66',
    backgroundColor: '#FAF8FC',
    border: '1px solid #E7E1EC',
    cursor: 'pointer',
  },
  filterPillActive: {
    color: '#FFFFFF',
    backgroundColor: '#0072BB',
    borderColor: '#0072BB',
  },
  ratingPillActive: {
    color: '#FFFFFF',
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  select: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid #E7E1EC',
    backgroundColor: '#FFFFFF',
    fontSize: '11px',
    fontWeight: 600,
    color: '#5F5A66',
    outline: 'none',
  },
  loadMore: {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #E7E1EC',
    backgroundColor: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 600,
    color: '#5F5A66',
    cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: '80px 20px', color: '#6B6572' },
  empty: { textAlign: 'center', padding: '80px 20px', color: '#6B6572' },
};
