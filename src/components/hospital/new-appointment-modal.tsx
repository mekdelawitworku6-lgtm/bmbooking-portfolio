'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import {
  fetchHospitalDoctors,
  fetchHospitalPatients,
  fetchHospitalScheduleForDoctor,
  createHospitalAppointment,
  registerHospitalPatient,
} from '@/lib/store/slices/hospitalSlice';
import { MedText } from '@/components/ui/med-text';
import { X, Search, Loader2, UserPlus, Check, Calendar, Clock, XCircle } from 'lucide-react';
import { formatTime } from '@/lib/utils/ethiopianDate';

interface PatientResult {
  id: number;
  fullName?: string | null;
  phone: string | null;
}

interface DoctorOption {
  id: number;
  fullName: string | null;
  specialization?: string | null;
  status?: string;
}

interface SlotOption {
  id: number;
  startTime: string;
  endTime: string;
  maxPatients: number;
  _count?: { bookings: number };
}

export default function NewAppointmentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'search' | 'register'>('search');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [searching, setSearching] = useState(false);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [patientType, setPatientType] = useState<'cash' | 'credit'>('cash');
  const [creditOrganization, setCreditOrganization] = useState('');

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [registerForm, setRegisterForm] = useState({ phone: '', fullName: '', gender: '', dateOfBirth: '' });
  const [registerSaving, setRegisterSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = () => {
    setMode('search');
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setDoctorId('');
    setDate('');
    setReason('');
    setPatientType('cash');
    setCreditOrganization('');
    setSlots([]);
    setSlotId(null);
    setError('');
    setRegisterForm({ phone: '', fullName: '', gender: '', dateOfBirth: '' });
  };

  useEffect(() => {
    if (!open) return;
    reset();
    (async () => {
      try {
        const res = await dispatch(fetchHospitalDoctors()).unwrap();
        setDoctors((res || []).filter((d: DoctorOption) => !d.status || d.status === 'Approved'));
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dispatch]);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      setSlotId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      try {
        const res: any[] = await dispatch(
          fetchHospitalScheduleForDoctor({ doctorId: Number(doctorId), date })
        ).unwrap();
        if (cancelled) return;
        const allSlots: SlotOption[] = (res || []).flatMap((sched: any) => sched.slots || []);
        allSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setSlots(allSlots);
        setSlotId((prev) => (prev && allSlots.find((s) => s.id === prev) ? prev : null));
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, dispatch]);

  const handleSearch = (value: string) => {
    setPatientQuery(value);
    setSelectedPatient(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res: PatientResult[] = await dispatch(fetchHospitalPatients(value)).unwrap();
        setPatientResults(res || []);
      } catch {
        setPatientResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleRegisterPatient = async (e: FormEvent) => {
    e.preventDefault();
    const digits = registerForm.phone.replace(/[^0-9]/g, '');
    if (digits.length !== 9 || !registerForm.fullName.trim()) return;
    setRegisterSaving(true);
    setError('');
    try {
      const patient: any = await dispatch(
        registerHospitalPatient({
          phone: `+251${digits}`,
          fullName: registerForm.fullName.trim(),
          gender: registerForm.gender || undefined,
          dateOfBirth: registerForm.dateOfBirth || undefined,
        })
      ).unwrap();
      setSelectedPatient({
        id: patient.id,
        phone: patient.phone,
        fullName: patient.patientProfile?.fullName || registerForm.fullName.trim(),
      });
      setMode('search');
      setRegisterForm({ phone: '', fullName: '', gender: '', dateOfBirth: '' });
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Failed to register patient');
    } finally {
      setRegisterSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !doctorId || !slotId) return;
    setSaving(true);
    setError('');
    try {
      const selectedSlot = slots.find((s) => s.id === slotId);
      if (!selectedSlot) {
        setError('Please select a valid time slot.');
        setSaving(false);
        return;
      }
      await dispatch(
        createHospitalAppointment({
          patientId: selectedPatient.id,
          doctorId: Number(doctorId),
          dateTime: selectedSlot.startTime,
          slotId,
          reason: reason || undefined,
          patientType,
          creditOrganization: patientType === 'credit' ? creditOrganization.trim() || undefined : undefined,
        })
      ).unwrap();
      await onCreated?.();
      reset();
      onClose();
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err?.message || 'Failed to create appointment';
      setError(
        message.toLowerCase().includes('double book')
          ? 'This doctor is already booked for this time!'
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const canSubmit = !!selectedPatient && !!doctorId && !!slotId && !saving;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[16px] w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <MedText variant="h2" as="h3" className="text-[20px] font-bold">New Appointment</MedText>
            <MedText variant="metadata" className="text-muted mt-0.5">
              Create a walk-in appointment for a patient.
            </MedText>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-[10px] bg-error/5 border border-error/20 text-error text-[13px] flex items-center gap-2">
            <XCircle size={15} /> {error}
          </div>
        )}

        {/* Patient selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <MedText variant="body" className="text-[13px] font-semibold">Patient</MedText>
            <button
              type="button"
              onClick={() => setMode(mode === 'search' ? 'register' : 'search')}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              {mode === 'search' ? <><UserPlus size={13} /> New patient</> : <>Back to search</>}
            </button>
          </div>

          {selectedPatient ? (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-[10px] border border-primary/30 bg-primary/5">
              <Check size={16} className="text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-text truncate">{selectedPatient.fullName || 'Patient'}</div>
                <div className="text-[12px] text-muted">{selectedPatient.phone || ''}</div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-muted hover:text-text"><X size={16} /></button>
            </div>
          ) : mode === 'search' ? (
            <div className="relative">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="w-full pl-9 pr-9 py-2.5 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-primary"
                  placeholder="Search patient by name or phone..."
                  value={patientQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
              </div>
              {patientResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-[10px] border border-border bg-surface shadow-lg">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientQuery(''); }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-foreground/5 border-b border-border/60 last:border-0"
                    >
                      <div className="text-[13px] font-medium text-text">{p.fullName || 'Patient'}</div>
                      <div className="text-[12px] text-muted">{p.phone || 'No phone'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegisterPatient} className="space-y-2.5 rounded-[10px] border border-border p-3.5">
              <input
                className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-primary"
                placeholder="Full name"
                value={registerForm.fullName}
                onChange={(e) => setRegisterForm((f) => ({ ...f, fullName: e.target.value }))}
              />
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-[10px] border border-r-0 border-border bg-foreground/5 text-[13px] text-muted">+251</span>
                <input
                  className="flex-1 px-3 py-2.5 border border-border rounded-r-[10px] text-[13px] focus:outline-none focus:border-primary"
                  placeholder="9XXXXXXXX"
                  inputMode="numeric"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
                  value={registerForm.gender}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
                  value={registerForm.dateOfBirth}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                disabled={registerSaving || registerForm.phone.replace(/[^0-9]/g, '').length !== 9 || !registerForm.fullName.trim()}
                className="w-full py-2.5 rounded-[10px] bg-primary text-white text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerSaving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Register & Select
              </button>
            </form>
          )}
        </div>

        {/* Doctor + date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Doctor</MedText>
            <select
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
              value={doctorId}
              onChange={(e) => { setDoctorId(e.target.value ? Number(e.target.value) : ''); setSlotId(null); }}
            >
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName || `Doctor #${d.id}`}{d.specialization ? ` • ${d.specialization}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Date</MedText>
            <input
              type="date"
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSlotId(null); }}
            />
          </div>
        </div>

        {/* Slots */}
        <div className="mb-4">
          <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Time slot</MedText>
          {!doctorId || !date ? (
            <MedText variant="metadata" className="text-muted">Select a doctor and date to see available slots.</MedText>
          ) : loadingSlots ? (
            <div className="flex items-center gap-2 text-[13px] text-muted py-2"><Loader2 size={15} className="animate-spin" /> Loading slots...</div>
          ) : slots.length === 0 ? (
            <MedText variant="metadata" className="text-muted">No slots available for this doctor on this date.</MedText>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto">
              {slots.map((s) => {
                const booked = s._count?.bookings ?? 0;
                const full = booked >= s.maxPatients;
                const isSel = slotId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={full}
                    onClick={() => setSlotId(s.id)}
                    className={`px-2 py-2 rounded-[10px] text-[12px] font-medium border flex flex-col items-center gap-0.5 ${
                      isSel ? 'border-primary bg-primary text-white' : full ? 'border-border bg-foreground/5 text-muted cursor-not-allowed' : 'border-border bg-surface text-text hover:border-primary'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Clock size={11} />{formatTime(new Date(s.startTime))}</span>
                    {full && <span className="text-[10px]">Full</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Billing / Patient Type */}
        <div className="mb-4">
          <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Billing / Patient Type</MedText>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPatientType('cash')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold border transition-all ${
                patientType === 'cash' ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-border hover:bg-foreground/5'
              }`}
            >
              💵 Cash Patient
            </button>
            <button
              type="button"
              onClick={() => setPatientType('credit')}
              className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold border transition-all ${
                patientType === 'credit' ? 'bg-purple-600 text-white border-purple-600' : 'bg-surface text-text-secondary border-border hover:bg-foreground/5'
              }`}
            >
              💳 Credit Patient
            </button>
          </div>
          {patientType === 'credit' && (
            <input
              type="text"
              placeholder="Credit company / Insurance name (e.g. Ethiopian Airlines)"
              value={creditOrganization}
              onChange={(e) => setCreditOrganization(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-purple-600 mt-2"
            />
          )}
        </div>

        {/* Reason */}
        <div className="mb-5">
          <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Reason (optional)</MedText>
          <input
            className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-primary"
            placeholder="e.g. Consultation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[10px] border border-border bg-surface text-[13px] font-semibold text-text-secondary hover:bg-foreground/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={(e) => handleSubmit(e as any)}
            className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
            Create Appointment
          </button>
        </div>
      </div>
    </div>
  );
}
