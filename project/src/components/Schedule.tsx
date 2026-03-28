import React, { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { storage } from '../utils/storage';

export const Schedule: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>(storage.getScheduleEvents());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const currentWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = currentWeek();

  const addEvent = (event: Omit<ScheduleEvent, 'id'>) => {
    const newEvent: ScheduleEvent = {
      ...event,
      id: Date.now().toString(),
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    storage.saveScheduleEvents(updatedEvents);
    setShowModal(false);
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
          <p className="text-gray-400">Plan your study sessions and activities</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          Add Event
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-7 bg-gray-700">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-4 text-center border-r border-gray-600 last:border-r-0">
              <div className="text-sm text-gray-300">
                {day.toLocaleDateString([], { weekday: 'short' })}
              </div>
              <div className="text-lg font-semibold text-white">
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Week content */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day.toISOString()} className="border-r border-gray-600 last:border-r-0 p-2">
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-purple-600 text-white text-xs p-2 rounded cursor-pointer hover:bg-purple-700 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-purple-200">
                        {new Date(event.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <AddEventModal
          onClose={() => setShowModal(false)}
          onAdd={addEvent}
        />
      )}
    </div>
  );
};

interface AddEventModalProps {
  onClose: () => void;
  onAdd: (event: Omit<ScheduleEvent, 'id'>) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    onAdd({
      title: formData.title,
      subject: formData.subject,
      startTime: startDateTime,
      endTime: endDateTime,
      description: formData.description || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold text-white mb-4">Add New Event</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Study Session"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Math"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};