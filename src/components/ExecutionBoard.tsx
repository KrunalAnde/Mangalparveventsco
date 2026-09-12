import React, { useState } from 'react';
import { Task, EventItem } from '../types';
import { saveTask, deleteTask } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle, Trash2, Calendar, User } from 'lucide-react';

interface ExecutionBoardProps {
  tasks: Task[];
  events: EventItem[];
}

export const ExecutionBoard: React.FC<ExecutionBoardProps> = ({ tasks, events }) => {
  const { currentUser, userProfile } = useAuth();
  const actorName = userProfile?.name || currentUser?.displayName || 'Coordinator';

  const [filterEventId, setFilterEventId] = useState<string>('ALL');
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('High');
  const [newEventId, setNewEventId] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('2026-10-15');

  const columns: { key: Task['status']; title: string; color: string }[] = [
    { key: 'To Do', title: 'To Do', color: 'border-slate-300 bg-slate-50/50' },
    { key: 'In Progress', title: 'In Progress', color: 'border-blue-300 bg-blue-50/30' },
    { key: 'Waiting', title: 'Waiting / External', color: 'border-amber-300 bg-amber-50/30' },
    { key: 'Done', title: 'Completed', color: 'border-emerald-300 bg-emerald-50/30' },
  ];

  const filteredTasks = tasks.filter((t) => {
    return filterEventId === 'ALL' || t.eventId === filterEventId;
  });

  const handleMoveTask = async (task: Task, newStatus: Task['status']) => {
    await saveTask({ ...task, status: newStatus }, actorName);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Delete this task?')) {
      await deleteTask(taskId, actorName);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const taskId = `task_${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      eventId: newEventId || (events.length > 0 ? events[0].id : 'evt_general'),
      title: newTitle,
      ownerName: actorName,
      status: 'To Do',
      priority: newPriority,
      dueAt: newDueDate,
    };
    await saveTask(newTask, actorName);
    setShowNewTaskModal(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6" id="execution_board">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Event Execution Board (Kanban)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            S17: Real-time coordination of catering tastings, mandap measurements, sound checks & Muhurt cues
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
          >
            <option value="ALL">All Active Events ({events.length})</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} {e.status === 'Confirmed' || e.status === 'Booking Confirmed' ? '• [Booking Confirmed]' : `• [${e.status}]`}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Action Item</span>
          </button>
        </div>
      </div>

      {/* 4 Kanban Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-xl border ${col.color} p-4 flex flex-col justify-between min-h-[500px] shadow-2xs`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.map((task) => {
                    const parentEvent = events.find((e) => e.id === task.eventId);
                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5 text-xs hover:border-amber-400 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800 leading-snug">{task.title}</span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                              task.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : task.priority === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div className="font-semibold text-slate-700 truncate">
                            {parentEvent?.title || 'General'}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span>👤 {task.ownerName}</span>
                            <span>Due: {task.dueAt}</span>
                          </div>
                        </div>

                        {/* Status Shift Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            {col.key !== 'To Do' && (
                              <button
                                onClick={() => handleMoveTask(task, 'To Do')}
                                title="Move to To Do"
                                className="px-1.5 py-0.5 bg-slate-100 text-[10px] rounded hover:bg-slate-200"
                              >
                                &larr;
                              </button>
                            )}
                            {col.key !== 'In Progress' && (
                              <button
                                onClick={() => handleMoveTask(task, 'In Progress')}
                                title="Move to In Progress"
                                className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded hover:bg-blue-100 font-bold"
                              >
                                Prog
                              </button>
                            )}
                            {col.key !== 'Waiting' && (
                              <button
                                onClick={() => handleMoveTask(task, 'Waiting')}
                                title="Move to Waiting"
                                className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] rounded hover:bg-amber-100 font-bold"
                              >
                                Wait
                              </button>
                            )}
                            {col.key !== 'Done' && (
                              <button
                                onClick={() => handleMoveTask(task, 'Done')}
                                title="Mark Completed"
                                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] rounded hover:bg-emerald-100 font-bold"
                              >
                                ✓ Done
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Operational Action Item</h3>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Confirm generator backup with lawn manager"
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Linked Event</label>
                <select
                  value={newEventId}
                  onChange={(e) => setNewEventId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} {e.status === 'Confirmed' || e.status === 'Booking Confirmed' ? '• [Booking Confirmed]' : `• [${e.status}]`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer"
              >
                Save Action Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
