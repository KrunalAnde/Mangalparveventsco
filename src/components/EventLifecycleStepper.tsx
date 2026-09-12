import React, { useState } from 'react';
import { EventItem, EventStatus } from '../types';
import {
  Check,
  FileSpreadsheet,
  Users,
  Play,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Info,
} from 'lucide-react';

export type LifecycleStageName = 'Booking' | 'Planning' | 'Execution' | 'Closing';

export interface LifecycleStageConfig {
  id: string;
  name: LifecycleStageName;
  stageNumber: number;
  subtitle: string;
  description: string;
  primaryStatus: EventStatus;
  subStatuses: EventStatus[];
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: LifecycleStageConfig[] = [
  {
    id: 'stage_booking',
    name: 'Booking',
    stageNumber: 1,
    subtitle: 'Costing & Proposals',
    description: 'Requirements mapped, dynamic pricing calculated, client proposal & token advance.',
    primaryStatus: 'Quoted',
    subStatuses: ['Draft', 'Requirement Pending', 'Costing', 'Quoted', 'Negotiating'],
    icon: FileSpreadsheet,
  },
  {
    id: 'stage_planning',
    name: 'Planning',
    stageNumber: 2,
    subtitle: 'Vendor Contracts & Prep',
    description: 'Date locked, booking confirmed with advance deposit, vendors contracted, tasks generated.',
    primaryStatus: 'Booking Confirmed',
    subStatuses: ['Booking Confirmed', 'Confirmed'],
    icon: Users,
  },
  {
    id: 'stage_execution',
    name: 'Execution',
    stageNumber: 3,
    subtitle: 'Live Event Delivery',
    description: 'On-site coordination, live vendor check-in, runsheet monitoring & issue resolution.',
    primaryStatus: 'In Execution',
    subStatuses: ['In Execution'],
    icon: Play,
  },
  {
    id: 'stage_closing',
    name: 'Closing',
    stageNumber: 4,
    subtitle: 'Settlement & Handover',
    description: 'Final customer invoice cleared, vendor accounts settled, client feedback & archival.',
    primaryStatus: 'Completed',
    subStatuses: ['Completed'],
    icon: CheckCircle2,
  },
];

interface EventLifecycleStepperProps {
  event: EventItem;
  onUpdateStatus: (newStatus: EventStatus) => Promise<void> | void;
  quotesCount?: number;
  assignmentsCount?: number;
  tasksCount?: number;
  pendingTasksCount?: number;
}

export const EventLifecycleStepper: React.FC<EventLifecycleStepperProps> = ({
  event,
  onUpdateStatus,
  quotesCount = 0,
  assignmentsCount = 0,
  tasksCount = 0,
  pendingTasksCount = 0,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStageForDetail, setSelectedStageForDetail] = useState<LifecycleStageName | null>(null);

  // Determine current active stage index (0 to 3)
  const getStageIndex = (status: EventStatus): number => {
    const s = (status || '').trim().toLowerCase();
    if (s === 'cancelled') return -1;
    if (['draft', 'requirement pending', 'costing', 'quoted', 'negotiating'].includes(s)) return 0;
    if (s === 'confirmed' || s === 'booking confirmed') return 1;
    if (s === 'in execution') return 2;
    if (s === 'completed') return 3;
    return 0;
  };

  const currentStageIndex = getStageIndex(event.status);
  const isCancelled = event.status === 'Cancelled';

  // Calculate progress percentage for horizontal bar
  const progressPercent = isCancelled
    ? 0
    : currentStageIndex === 0
    ? 12
    : currentStageIndex === 1
    ? 38
    : currentStageIndex === 2
    ? 72
    : 100;

  const handleStageClick = async (stage: LifecycleStageConfig) => {
    if (isCancelled) return;
    if (event.status === stage.primaryStatus) {
      setSelectedStageForDetail((prev) => (prev === stage.name ? null : stage.name));
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateStatus(stage.primaryStatus);
      setSelectedStageForDetail(stage.name);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubStatusSelect = async (newStatus: EventStatus) => {
    try {
      setIsUpdating(true);
      await onUpdateStatus(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      id="event_lifecycle_stepper"
      className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs"
    >
      {/* Header bar of Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
              Lifecycle Progress
            </span>
            <span className="text-xs text-slate-500">
              Stage {isCancelled ? '—' : currentStageIndex + 1} of 4:
            </span>
            <span className="text-xs font-bold text-slate-900">
              {isCancelled ? 'Event Cancelled' : STAGES[currentStageIndex]?.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Current Status:{' '}
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {event.status}
            </span>
            <span className="mx-2 text-slate-300">•</span>
            Click any stage to fast-track pipeline progression.
          </p>
        </div>

        {/* Current Stage Quick Advance Button */}
        {!isCancelled && currentStageIndex < 3 && (
          <button
            id="advance_next_stage_btn"
            disabled={isUpdating}
            onClick={() => handleStageClick(STAGES[currentStageIndex + 1])}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            <span>Advance to {STAGES[currentStageIndex + 1].name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Stepper Progress Container */}
      <div className="relative py-2 px-1 sm:px-4">
        {/* Continuous Connecting Background Line */}
        <div className="absolute top-[28px] sm:top-[30px] left-6 sm:left-12 right-6 sm:right-12 h-1.5 bg-slate-200/90 rounded-full z-0">
          {/* Active Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 4 Stepper Columns */}
        <div className="relative z-10 grid grid-cols-4 gap-1 sm:gap-4">
          {STAGES.map((stage, idx) => {
            const isCompleted = !isCancelled && currentStageIndex > idx;
            const isCurrent = !isCancelled && currentStageIndex === idx;
            const isUpcoming = isCancelled || currentStageIndex < idx;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                id={`stepper_step_${stage.name.toLowerCase()}`}
                onClick={() => handleStageClick(stage)}
                className={`flex flex-col items-center text-center group cursor-pointer transition-all duration-200 select-none ${
                  isUpdating ? 'pointer-events-none opacity-70' : ''
                }`}
              >
                {/* Node Circle */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs group-hover:scale-105 group-hover:bg-emerald-700 ring-4 ring-white'
                      : isCurrent
                      ? 'bg-amber-600 text-white shadow-md ring-4 ring-amber-100 sm:ring-8 sm:ring-amber-50/80 scale-105'
                      : 'bg-white text-slate-400 border-2 border-slate-300 ring-4 ring-white group-hover:border-amber-400 group-hover:text-amber-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5 animate-pulse" />
                  ) : (
                    <span className="text-xs sm:text-sm font-black">{stage.stageNumber}</span>
                  )}
                </div>

                {/* Stage Title & Badges */}
                <div className="mt-3 flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap ${
                        isCurrent
                          ? 'text-amber-900 font-extrabold'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>

                  {/* Stage Pill / Status */}
                  <div className="mt-1 hidden xs:flex">
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                        In Progress
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Subtitle (Desktop) */}
                  <p className="hidden md:block text-[11px] text-slate-500 mt-1 max-w-[130px] line-clamp-1">
                    {stage.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-status and Contextual Helper for the Active Stage */}
      {!isCancelled && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-lg">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-slate-900">
                {STAGES[currentStageIndex]?.name} Stage Scope:
              </span>{' '}
              <span className="text-slate-600">
                {STAGES[currentStageIndex]?.description}
              </span>
            </div>
          </div>

          {/* Sub-status selector if stage has multiple stages (e.g. Booking) */}
          {STAGES[currentStageIndex]?.subStatuses.length > 1 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-500 text-[11px] font-bold">Sub-status:</span>
              <select
                id="lifecycle_substatus_select"
                value={event.status}
                disabled={isUpdating}
                onChange={(e) => handleSubStatusSelect(e.target.value as EventStatus)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {STAGES[currentStageIndex].subStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Cancelled Alert if applicable */}
      {isCancelled && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>This event has been marked as <strong>Cancelled</strong>. Pipeline progress is frozen.</span>
          </div>
          <button
            onClick={() => handleSubStatusSelect('Draft')}
            className="px-2.5 py-1 bg-white border border-red-300 text-red-700 rounded font-bold hover:bg-red-50 transition-colors"
          >
            Re-open Event
          </button>
        </div>
      )}
    </div>
  );
};
