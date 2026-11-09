import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plane,
  FolderKanban,
  CheckSquare,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { tripsAPI, projectsAPI, tasksAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimelineEvents();
  }, []);

  const loadTimelineEvents = async () => {
    try {
      setLoading(true);
      const [tripsRes, projRes, tasksRes] = await Promise.all([
        tripsAPI.getAll(),
        projectsAPI.getAll(),
        tasksAPI.getAll()
      ]);

      const items = [];

      // Add trips
      (tripsRes.data.trips || []).forEach((t) => {
        if (t.departureDate) {
          items.push({
            id: `trip-dep-${t._id}`,
            date: new Date(t.departureDate),
            title: `🛫 Depart for ${t.destination} (${t.name})`,
            type: 'TRIP',
            color: 'border-blue-500 bg-blue-500/10 text-blue-300'
          });
        }
        if (t.returnDate) {
          items.push({
            id: `trip-ret-${t._id}`,
            date: new Date(t.returnDate),
            title: `🛬 Return from ${t.destination}`,
            type: 'TRIP',
            color: 'border-blue-500 bg-blue-500/10 text-blue-300'
          });
        }
      });

      // Add projects
      (projRes.data.projects || []).forEach((p) => {
        if (p.deadline) {
          items.push({
            id: `proj-${p._id}`,
            date: new Date(p.deadline),
            title: `🎯 Project Deadline: ${p.name}`,
            type: 'PROJECT',
            color: 'border-purple-500 bg-purple-500/10 text-purple-300'
          });
        }
      });

      // Add tasks
      (tasksRes.data.tasks || []).forEach((tk) => {
        if (tk.dueDate) {
          items.push({
            id: `task-${tk._id}`,
            date: new Date(tk.dueDate),
            title: `✅ Task: ${tk.title}`,
            type: 'TASK',
            color: tk.priority === 'Urgent'
              ? 'border-rose-500 bg-rose-500/10 text-rose-300'
              : 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
          });
        }
      });

      // Sort chronological
      items.sort((a, b) => a.date - b.date);
      setEvents(items);
    } catch (err) {
      console.error('Failed to load timeline events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Compiling your timeline & calendar..." />;
  }

  // Group events by date string
  const groupedEvents = events.reduce((acc, ev) => {
    const key = ev.date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon size={22} className="text-indigo-400" />
            Timeline & Calendar
          </h1>
          <p className="text-xs text-slate-400">
            Unified schedule aggregating travel dates, project milestones, and pending task deadlines.
          </p>
        </div>
      </div>

      {/* Timeline Stream */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                {dayEvents.map((ev) => (
                  <Card key={ev.id} className={`p-4 border-l-4 ${ev.color} flex items-center justify-between`}>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">{ev.title}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {ev.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Badge
                      variant={
                        ev.type === 'TRIP' ? 'primary' : ev.type === 'PROJECT' ? 'violet' : 'neutral'
                      }
                    >
                      {ev.type}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-400">
          <CalendarIcon size={32} className="text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">No Scheduled Events</h3>
          <p className="text-xs text-slate-500">Plan a trip or set due dates on tasks to populate your timeline.</p>
        </Card>
      )}
    </div>
  );
};
