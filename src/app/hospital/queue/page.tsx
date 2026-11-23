'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  fetchHospitalQueueConfig,
  updateHospitalQueueConfig,
} from '@/lib/store/slices/hospitalSlice';
import { MedText } from '@/components/ui/med-text';
import { MedCard } from '@/components/ui/med-card';
import { MedButton } from '@/components/ui/med-button';
import { hasPermission } from '@/lib/permissions';
import { ListOrdered, ShieldCheck, CheckCircle2 } from 'lucide-react';

const METHODS: { value: string; title: string; description: string }[] = [
  {
    value: 'standard',
    title: 'Standard',
    description: 'First-come, first-served. Queue numbers are assigned sequentially as appointments are confirmed.',
  },
  {
    value: 'reserved_priority',
    title: 'Reserved priority positions',
    description:
      'The first positions are held for priority patients and assigned by authorized staff. Everyone else is numbered after the reserved block.',
  },
];

export default function HospitalQueuePage() {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((s) => s.auth);
  const { queueConfig, permissions, hospitalRole } = useAppSelector((s) => s.hospital);

  const canEdit = hasPermission(permissions, hospitalRole, 'settings.edit');

  const [method, setMethod] = useState('reserved_priority');
  const [reserved, setReserved] = useState('3');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) dispatch(fetchHospitalQueueConfig());
  }, [dispatch, token]);

  useEffect(() => {
    if (queueConfig) {
      setMethod(queueConfig.queueMethod || 'reserved_priority');
      setReserved(String(queueConfig.reservedPositions ?? 3));
    }
  }, [queueConfig]);

  const handleSave = async () => {
    setError('');
    const value = Number(reserved);
    if (method === 'reserved_priority' && (!Number.isInteger(value) || value < 0 || value > 50)) {
      setError('Reserved positions must be a whole number between 0 and 50.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      await dispatch(
        updateHospitalQueueConfig({
          queueMethod: method,
          reservedPositions: method === 'reserved_priority' ? value : 0,
          priorityAssignment: 'authorized_staff',
        }),
      ).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Failed to save queue configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <ListOrdered size={20} className="text-primary" />
        <MedText variant="h2" as="h1" className="text-[20px] font-bold text-text">Queue Configuration</MedText>
      </div>
      <MedText variant="body" className="text-text-secondary text-[13px] mb-6">
        Choose how appointment queue numbers are generated for your doctors.
      </MedText>

      {!canEdit && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-foreground/5 border border-border text-[13px] text-text-secondary">
          You have view-only access. Only the hospital owner can change the queue configuration.
        </div>
      )}

      <MedCard className="p-5 mb-4">
        <MedText variant="body" as="h3" className="text-[15px] font-semibold text-text mb-3">Queue method</MedText>
        <div className="flex flex-col gap-2">
          {METHODS.map((m) => {
            const active = method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                disabled={!canEdit}
                onClick={() => setMethod(m.value)}
                className={`text-left w-full p-3.5 rounded-xl border transition-colors ${
                  active ? 'border-[#0E8A5F] bg-[#0E8A5F]/5' : 'border-border hover:bg-foreground/5'
                } ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-[#0E8A5F]' : 'border-border'
                    }`}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-[#0E8A5F]" />}
                  </span>
                  <span className="text-[14px] font-semibold text-text">{m.title}</span>
                </div>
                <p className="text-[12px] text-text-secondary mt-1 ml-6">{m.description}</p>
              </button>
            );
          })}
        </div>

        {method === 'reserved_priority' && (
          <div className="mt-4 pl-1">
            <label className="block text-[13px] font-medium text-text mb-1.5">Reserved priority positions</label>
            <input
              type="number"
              min={0}
              max={50}
              value={reserved}
              disabled={!canEdit}
              onChange={(e) => setReserved(e.target.value)}
              className="w-28 p-2.5 rounded-xl border border-border bg-surface text-center text-[14px] focus:outline-none focus:border-[#0E8A5F] disabled:opacity-70"
            />
            <p className="text-[12px] text-text-secondary mt-1.5">
              Positions 1–{reserved || 0} are reserved for priority patients; regular patients are numbered from{' '}
              {(Number(reserved) || 0) + 1}. Priority is assigned by authorized staff when confirming an appointment.
            </p>
          </div>
        )}
      </MedCard>

      <MedCard className="p-5 mb-6">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-[#0E8A5F] mt-0.5" />
          <div>
            <MedText variant="body" as="h3" className="text-[15px] font-semibold text-text mb-1">Priority assignment</MedText>
            <MedText variant="body" className="text-[13px] text-text-secondary">
              Authorized hospital staff — any staff member who can approve appointments — can mark a patient as
              priority when confirming. If the reserved positions are full, priority patients are placed at the end of
              the normal queue.
            </MedText>
          </div>
        </div>
      </MedCard>

      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-error/5 border border-error/20 text-error text-[13px]">{error}</div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <MedButton
            title={saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            icon={saved ? <CheckCircle2 size={16} /> : undefined}
            className="max-w-[200px]"
          />
        </div>
      )}
    </div>
  );
}
