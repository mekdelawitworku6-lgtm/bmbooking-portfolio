'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { registerHospitalPatient } from '@/lib/store/slices/hospitalSlice';
import { MedText } from '@/components/ui/med-text';
import { X, Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';

const emptyForm = { phone: '', fullName: '', gender: '', dateOfBirth: '', emergencyContact: '' };

export default function AddPatientModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (patient: any) => void | Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setError('');
      setSuccess('');
    }
  }, [open]);

  const digits = form.phone.replace(/[^0-9]/g, '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (digits.length !== 9 || !form.fullName.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const patient: any = await dispatch(
        registerHospitalPatient({
          phone: `+251${digits}`,
          fullName: form.fullName.trim(),
          gender: form.gender || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          emergencyContact: form.emergencyContact.trim() || undefined,
        })
      ).unwrap();
      setSuccess(`${patient?.patientProfile?.fullName || form.fullName.trim()} registered successfully.`);
      setForm(emptyForm);
      await onAdded?.(patient);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-[16px] w-full max-w-[480px] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <MedText variant="h2" as="h3" className="text-[20px] font-bold">Add Patient</MedText>
            <MedText variant="metadata" className="text-muted mt-0.5">Register a new patient at this hospital.</MedText>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-[10px] bg-error/5 border border-error/20 text-error text-[13px] flex items-center gap-2">
            <XCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-3.5 py-2.5 rounded-[10px] bg-success/5 border border-success/20 text-success text-[13px] flex items-center gap-2">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Full name</MedText>
            <input
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-primary"
              placeholder="e.g. Abebe Kebede"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div>
            <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Phone number</MedText>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-[10px] border border-r-0 border-border bg-foreground/5 text-[13px] text-muted">+251</span>
              <input
                className="flex-1 px-3 py-2.5 border border-border rounded-r-[10px] text-[13px] focus:outline-none focus:border-primary"
                placeholder="9XXXXXXXX"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Gender</MedText>
              <select
                className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Date of birth</MedText>
              <input
                type="date"
                className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] bg-surface focus:outline-none focus:border-primary"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <MedText variant="body" className="text-[13px] font-semibold mb-1.5 block">Emergency contact (optional)</MedText>
            <input
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13px] focus:outline-none focus:border-primary"
              placeholder="Phone number"
              value={form.emergencyContact}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] border border-border bg-surface text-[13px] font-semibold text-text-secondary hover:bg-foreground/5"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving || digits.length !== 9 || !form.fullName.trim()}
              className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
