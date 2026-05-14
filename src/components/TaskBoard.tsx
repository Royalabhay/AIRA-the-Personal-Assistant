import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, CheckCircle, Circle, Calendar, Plus, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  projectId?: string;
  priority?: 'low' | 'medium' | 'high';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  onToggleTask: (id: string) => void;
  hideTasks?: boolean;
  hideProjects?: boolean;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, projects, onToggleTask, hideTasks, hideProjects }) => {
  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-400';
      case 'low': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  const priorityMap = { high: 3, medium: 2, low: 1, undefined: 0 };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status first (pending first)
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    
    // Then sort by priority
    const priorityA = priorityMap[a.priority as keyof typeof priorityMap] || 0;
    const priorityB = priorityMap[b.priority as keyof typeof priorityMap] || 0;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    
    // Then sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden font-sans">
      {/* Projects Section */}
      {!hideProjects && (
        <div className="flex-1 min-h-0 flex flex-col pr-2 custom-scrollbar">
          {projects.map((proj) => (
            <motion.div 
              key={proj.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-aria-bg rounded-xl flex items-center space-x-3 group cursor-pointer hover:bg-white/40 transition-all border border-black/05 mb-3"
            >
              <div className="w-2 h-2 rounded-full bg-aria-accent group-hover:scale-125 transition-transform" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-aria-text">{proj.name}</p>
                {proj.description && <p className="text-[10px] text-aria-secondary/50 truncate">{proj.description}</p>}
              </div>
              <ChevronRight size={12} className="text-aria-secondary/20" />
            </motion.div>
          ))}
          {projects.length === 0 && (
            <div className="p-8 rounded-2xl border border-dashed border-black/10 text-center">
              <p className="text-[11px] text-aria-secondary/40 leading-relaxed italic font-display">
                Empty memory...<br />Tell Aria to create a folder.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Section */}
      {!hideTasks && (
        <div className="flex-1 min-h-0 flex flex-col pr-2 custom-scrollbar space-y-3">
          <AnimatePresence mode='popLayout'>
            {sortedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-4 rounded-2xl flex items-start space-x-3 transition-all border border-black/05 bg-white shadow-sm",
                  task.status === 'completed' ? 'opacity-40' : 'opacity-100 hover:border-aria-accent/30'
                )}
              >
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => onToggleTask(task.id)}
                    className="text-aria-accent transition-transform active:scale-95"
                  >
                    {task.status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                  {task.priority && (
                    <div className={cn("w-1 h-8 rounded-full mt-2", getPriorityColor(task.priority))} title={`Priority: ${task.priority}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    {task.dueDate && (
                      <div className="inline-block px-2 py-0.5 bg-[#FFE8ED] text-aria-accent rounded-md text-[9px] font-bold">
                        {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {task.recurrence && task.recurrence !== 'none' && (
                      <div className="flex items-center space-x-1 text-[8px] text-aria-secondary/40 font-bold uppercase tracking-tighter">
                         <Sparkles size={10} />
                         <span>{task.recurrence}</span>
                      </div>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm font-medium text-aria-text leading-snug",
                    task.status === 'completed' && "line-through opacity-70"
                  )}>{task.title}</p>
                  {task.description && <p className="text-[11px] text-aria-secondary/60 mt-1">{task.description}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-10 space-y-2 mt-4">
               <Plus size={32} />
               <p className="text-[11px] uppercase tracking-widest font-bold">Free Day</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
