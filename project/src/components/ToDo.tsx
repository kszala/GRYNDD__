import React, { useState } from 'react';
import { Plus, Check, Trash2, Edit3 } from 'lucide-react';
import { TodoItem } from '../types';
import { storage } from '../utils/storage';

export const ToDo: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>(storage.getTodos());
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date(),
    };

    const updatedTodos = [todo, ...todos];
    setTodos(updatedTodos);
    storage.saveTodos(updatedTodos);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed: !todo.completed,
            completedAt: !todo.completed ? new Date() : undefined,
          }
        : todo
    );
    setTodos(updatedTodos);
    storage.saveTodos(updatedTodos);
  };

  const deleteTodo = (id: string) => {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    storage.saveTodos(updatedTodos);
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;

    const updatedTodos = todos.map((todo) =>
      todo.id === editingId ? { ...todo, text: editText.trim() } : todo
    );
    setTodos(updatedTodos);
    storage.saveTodos(updatedTodos);
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">To-Do List</h1>
        <p className="text-gray-400">Keep track of your tasks and stay organized</p>
      </div>

      <div className="max-w-2xl">
        {/* Add new todo */}
        <form onSubmit={addTodo} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
        </form>

        {/* Active todos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Active Tasks ({activeTodos.length})
          </h2>
          <div className="space-y-2">
            {activeTodos.map((todo) => (
              <TodoItemComponent
                key={todo.id}
                todo={todo}
                isEditing={editingId === todo.id}
                editText={editText}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onEditTextChange={setEditText}
              />
            ))}
            {activeTodos.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Check size={48} className="mx-auto mb-4 opacity-50" />
                <p>No active tasks. Great job!</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Completed ({completedTodos.length})
            </h2>
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <TodoItemComponent
                  key={todo.id}
                  todo={todo}
                  isEditing={false}
                  editText=""
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onEditTextChange={setEditText}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TodoItemComponentProps {
  todo: TodoItem;
  isEditing: boolean;
  editText: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (todo: TodoItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
}

const TodoItemComponent: React.FC<TodoItemComponentProps> = ({
  todo,
  isEditing,
  editText,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <button
        onClick={() => onToggle(todo.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          todo.completed
            ? 'bg-green-600 border-green-600'
            : 'border-gray-500 hover:border-purple-500'
        }`}
      >
        {todo.completed && <Check size={14} className="text-white" />}
      </button>

      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={onSaveEdit}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        ) : (
          <span
            className={`${
              todo.completed
                ? 'text-gray-400 line-through'
                : 'text-white'
            }`}
          >
            {todo.text}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!todo.completed && !isEditing && (
          <button
            onClick={() => onStartEdit(todo)}
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <Edit3 size={16} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};