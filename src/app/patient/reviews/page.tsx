'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/ethiopianDate';
import { MedText } from '@/components/ui/med-text';
import { MedCard } from '@/components/ui/med-card';
import { MedButton } from '@/components/ui/med-button';
import {
  Star,
  Stethoscope,
  Building2,
  CalendarDays,
  MessageSquare,
  Send,
  X,
  Loader2,
  CheckCircle2,
  Pencil,
  Quote,
} from 'lucide-react';

interface ReviewTargetDoctor {
  id: number;
  fullName: string;
  specialization?: string | null;
  profilePicture?: string | null;
}

interface ReviewTargetHospital {
  id: number;
  name: string;
  image?: string | null;
}

interface Review {
  id: number;
  appointmentId: number;
  doctorId: number | null;
  hospitalId: number | null;
  rating: number;
  comment: string | null;
  hospitalResponse: string | null;
  hospitalRespondedAt: string | null;
  isHidden: boolean;
  hiddenReason?: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: ReviewTargetDoctor | null;
  hospital: ReviewTargetHospital | null;
  appointment: { id: number; dateTime: string; status: string } | null;
}

interface ReviewableAppointment {
  id: number;
  dateTime: string;
  doctorId: number;
  doctor: (ReviewTargetDoctor & { hospital?: ReviewTargetHospital | null }) | null;
  hospital: ReviewTargetHospital | null;
}

interface Summary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

interface ReviewResponse {
  reviews: Review[];
  summary: Summary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface EditorState {
  appointmentId: number;
  doctorId: number | null;
  hospitalId: number | null;
  doctorName: string;
  hospitalName: string;
  rating: number;
  comment: string;
}

const emptySummary: Summary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function Stars({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={onChange ? 'transition-transform hover:scale-110' : 'cursor-default'}
          aria-label={`${star} star`}
        >
          <Star
            size={size}
            className={star <= value ? 'text-star fill-star' : 'text-border'}
          />
        </button>
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
            <Star size={11} className="text-star fill-star flex-shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-star transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-6 text-right text-[11px] text-muted">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PatientReviewsPage() {
  const [tab, setTab] = useState<'pending' | 'mine'>('pending');
  const [pending, setPending] = useState<ReviewableAppointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const response = await api.get('/reviews/reviewable');
      setPending(response.data.data || []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load appointments to review'));
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const params: Record<string, string> = { sort, limit: '50' };
      if (ratingFilter !== 'All') params.rating = ratingFilter;
      const response = await api.get<{ status: string } & ReviewResponse>('/reviews/my', {
        params,
      });
      setReviews(response.data.reviews || []);
      setSummary(response.data.summary || emptySummary);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your reviews'));
    } finally {
      setLoadingReviews(false);
    }
  }, [sort, ratingFilter]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadPending(), loadReviews()]);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadPending, loadReviews]);

  const pendingCount = pending.length;

  const openPendingEditor = (appointment: ReviewableAppointment) => {
    setEditor({
      appointmentId: appointment.id,
      doctorId: appointment.doctorId || appointment.doctor?.id || null,
      hospitalId: appointment.hospital?.id || appointment.doctor?.hospital?.id || null,
      doctorName: appointment.doctor?.fullName || 'Doctor',
      hospitalName: appointment.hospital?.name || appointment.doctor?.hospital?.name || '',
      rating: 0,
      comment: '',
    });
  };

  const openEditEditor = (review: Review) => {
    setEditor({
      appointmentId: review.appointmentId,
      doctorId: review.doctorId,
      hospitalId: review.hospitalId,
      doctorName: review.doctor?.fullName || 'Doctor',
      hospitalName: review.hospital?.name || '',
      rating: review.rating,
      comment: review.comment || '',
    });
  };

  const submitReview = async () => {
    if (!editor) return;
    if (editor.rating < 1) {
      setError('Please select a star rating');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/reviews', {
        appointmentId: editor.appointmentId,
        doctorId: editor.doctorId,
        hospitalId: editor.hospitalId,
        rating: editor.rating,
        comment: editor.comment.trim() || undefined,
      });
      setEditor(null);
      await Promise.all([loadPending(), loadReviews()]);
      setTab('mine');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit review'));
    } finally {
      setSubmitting(false);
    }
  };

  const average = useMemo(
    () => (summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0'),
    [summary],
  );

  if (loading && pending.length === 0 && reviews.length === 0) {
    return (
      <div className="p-5 max-w-3xl mx-auto flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-3xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <MedText variant="h2" as="h2" className="text-[20px]">
            Ratings & Reviews
          </MedText>
          <MedText variant="metadata" className="text-text-secondary mt-1">
            Share feedback and manage the reviews you have written.
          </MedText>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-[12px] bg-surface border border-border px-3 py-2">
          <Star size={16} className="text-star fill-star" />
          <span className="text-[14px] font-semibold text-text">{average}</span>
          <span className="text-[12px] text-muted">({summary.totalReviews})</span>
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

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            tab === 'pending'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary'
          }`}
        >
          To review {pendingCount > 0 ? `(${pendingCount})` : ''}
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            tab === 'mine'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary'
          }`}
        >
          My reviews {summary.totalReviews > 0 ? `(${summary.totalReviews})` : ''}
        </button>
      </div>

      {tab === 'pending' ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <MedCard className="text-center py-12">
              <CheckCircle2 size={38} className="mx-auto text-success mb-3" />
              <MedText variant="body" className="text-text">
                You are all caught up
              </MedText>
              <MedText variant="metadata" className="text-muted mt-1">
                Completed appointments that have not been reviewed will appear here.
              </MedText>
            </MedCard>
          ) : (
            pending.map((appointment) => (
              <MedCard key={appointment.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Stethoscope size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <MedText variant="body" className="text-[15px] font-semibold text-text truncate">
                        {appointment.doctor?.fullName || 'Doctor'}
                      </MedText>
                      <MedText variant="metadata" className="truncate">
                        {appointment.doctor?.specialization || 'Appointment completed'}
                      </MedText>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-muted">
                          <CalendarDays size={12} />
                          {formatDate(new Date(appointment.dateTime), 'medium')}
                        </span>
                        {(appointment.hospital?.name ||
                          appointment.doctor?.hospital?.name) && (
                          <span className="flex items-center gap-1 text-[11px] text-muted">
                            <Building2 size={12} />
                            {appointment.hospital?.name ||
                              appointment.doctor?.hospital?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openPendingEditor(appointment)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-primary text-white text-[12px] font-semibold flex-shrink-0"
                  >
                    <Star size={13} />
                    Review
                  </button>
                </div>
              </MedCard>
            ))
          )}
        </div>
      ) : (
        <div>
          <MedCard className="mb-4">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex items-center gap-4 sm:w-[180px]">
                <div className="text-center">
                  <div className="text-[38px] font-bold text-text leading-none">{average}</div>
                  <div className="mt-2 flex justify-center">
                    <Stars value={Math.round(summary.averageRating)} size={15} />
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    {summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <RatingBars summary={summary} />
              </div>
            </div>
          </MedCard>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(['recent', 'highest', 'lowest'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSort(option)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all ${
                  sort === option
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                {option === 'recent' ? 'Most recent' : `${option} rated`}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            {['All', '5', '4', '3', '2', '1'].map((option) => (
              <button
                key={option}
                onClick={() => setRatingFilter(option)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  ratingFilter === option
                    ? 'bg-star text-white'
                    : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                {option === 'All' ? 'All' : `${option}★`}
              </button>
            ))}
          </div>

          {loadingReviews ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <MedCard className="text-center py-12">
              <MessageSquare size={36} className="mx-auto text-border mb-3" />
              <MedText variant="body" className="text-text">
                {summary.totalReviews === 0
                  ? 'No reviews yet'
                  : 'No reviews match this filter'}
              </MedText>
              <MedText variant="metadata" className="text-muted mt-1">
                {summary.totalReviews === 0
                  ? 'Your submitted reviews will appear here.'
                  : 'Try a different rating or sort order.'}
              </MedText>
            </MedCard>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <MedCard key={review.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Stars value={review.rating} size={15} />
                        <span className="text-[11px] font-semibold text-text">
                          {review.rating}.0
                        </span>
                        {review.isHidden && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-semibold">
                            Hidden by moderator
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted">
                        {review.doctor && (
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} />
                            {review.doctor.fullName}
                          </span>
                        )}
                        {review.hospital && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {review.hospital.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {formatDate(new Date(review.createdAt), 'medium')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditEditor(review)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-border text-[11px] font-semibold text-text-secondary hover:bg-foreground/5 flex-shrink-0"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </div>

                  {review.comment && (
                    <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-background px-3 py-2.5">
                      <Quote size={14} className="text-muted mt-0.5 flex-shrink-0" />
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {review.hospitalResponse && (
                    <div className="mt-3 rounded-[10px] border border-primary/15 bg-primary/5 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 size={12} className="text-primary" />
                        <span className="text-[11px] font-semibold text-primary">
                          {review.hospital?.name || 'Hospital'} response
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-text-secondary">
                        {review.hospitalResponse}
                      </p>
                    </div>
                  )}
                </MedCard>
              ))}
            </div>
          )}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-surface rounded-t-[20px] sm:rounded-[18px] p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <MedText variant="h2" as="h3">
                  {reviews.some((review) => review.appointmentId === editor.appointmentId)
                    ? 'Update your review'
                    : 'Rate your visit'}
                </MedText>
                <MedText variant="metadata" className="text-muted mt-1">
                  {editor.doctorName}
                  {editor.hospitalName ? ` · ${editor.hospitalName}` : ''}
                </MedText>
              </div>
              <button
                onClick={() => setEditor(null)}
                className="p-1.5 rounded-[8px] hover:bg-foreground/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-center py-4">
              <div className="flex justify-center">
                <Stars
                  value={editor.rating}
                  size={34}
                  onChange={(rating) => setEditor({ ...editor, rating })}
                />
              </div>
              <MedText variant="metadata" className="text-muted mt-2">
                {editor.rating > 0 ? `${editor.rating} out of 5 stars` : 'Tap a star to rate'}
              </MedText>
            </div>

            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              Comment (optional)
            </label>
            <textarea
              value={editor.comment}
              onChange={(event) =>
                setEditor({ ...editor, comment: event.target.value })
              }
              rows={4}
              maxLength={1000}
              placeholder="Tell others about your experience..."
              className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-[14px] text-text outline-none focus:border-primary resize-none"
            />
            <div className="text-right text-[11px] text-muted mt-1">
              {editor.comment.length}/1000
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditor(null)}
                className="flex-1 py-3 rounded-[10px] border border-border text-[13px] font-semibold text-text-secondary"
              >
                Cancel
              </button>
              <div className="flex-1">
                <MedButton
                  title="Submit review"
                  onPress={submitReview}
                  loading={submitting}
                  disabled={editor.rating < 1}
                  icon={<Send size={15} />}
                  className="py-3 text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
