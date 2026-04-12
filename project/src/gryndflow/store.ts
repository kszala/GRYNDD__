import { create } from "zustand";

export type Task = {
  id: string;
  title: string;
  duration?: number;
  subject?: string;
  created_at: string;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  estimate_minutes?: number;
  earliest_start?: string;
  due_date?: string;
  repeat?: string;
  flexible?: boolean;
  notes?: string;
  color?: string;
};

export type StudyBlock = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  subject?: string;
  status: "pending";
  origin: "manual";
  tags?: string[];
  priority?: "low" | "medium" | "high";
  estimate_minutes?: number;
  earliest_start?: string;
  due_date?: string;
  repeat?: string;
  flexible?: boolean;
  notes?: string;
  color?: string;
};

export const SESSION_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#a855f7",
  "#fb7185",
  "#f59e0b",
  "#14b8a6",
  "#6366f1",
  "#ec4899",
  "#84cc16",
  "#06b6d4",
];


type GryndFlowState = {
  tasks: Task[];
  blocks: StudyBlock[];
  selectedBlockId: string | null;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addBlock: (block: StudyBlock) => void;
  updateBlock: (id: string, updates: Partial<StudyBlock>) => void;
  removeBlock: (id: string) => void;
  setSelectedBlockId: (id: string | null) => void;
};

const seedTasks: Task[] = [
  {
    id: "task-physics-nlm",
    title: "Physics – NLM",
    duration: 120,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-maths-integration",
    title: "Maths – Integration",
    duration: 180,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-chemistry-revision",
    title: "Chemistry Revision",
    duration: 60,
    created_at: new Date().toISOString(),
  },
];

export const useGryndFlowStore = create<GryndFlowState>((set) => ({
  tasks: seedTasks,
  blocks: [],
  selectedBlockId: null,
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),
  addBlock: (block) =>
    set((state) => ({
      blocks: [...state.blocks, block],
    })),
  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      ),
    })),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
    })),
  setSelectedBlockId: (id) => set(() => ({ selectedBlockId: id })),
}));
