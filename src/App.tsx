/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db, signIn, signOut } from './lib/firebase';
import { createChat, getAriaVoice } from './lib/gemini';
import { AriaAvatar } from './components/Avatar';
import { Chat } from './components/Chat';
import { TaskBoard } from './components/TaskBoard';
import { Sparkles, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Msg { role: 'user' | 'model'; content: string; }
interface Task { id: string; title: string; status: 'pending' | 'completed'; description?: string; dueDate?: string; projectId?: string; }
interface Project { id: string; name: string; description?: string; }

import { Settings, X, Sliders } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState({ outfit: 'Casual', accessory: 'None' });
  const [characterProfile, setCharacterProfile] = useState({ 
    name: 'Aria', 
    bio: 'Your personal AI life assistant',
    traits: { playfulness: 0.5, formality: 0.5 }
  });
  const [chat, setChat] = useState<any>(null);

  // Initialize Chat
  useEffect(() => {
    if (user && !chat) {
      setChat(createChat(characterProfile));
    }
  }, [user, chat]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Fetch User profile/avatar
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.avatarConfig) setAvatarConfig(data.avatarConfig);
          if (data.characterProfile) setCharacterProfile(data.characterProfile);
        } else {
          const defaultConfig = { 
            displayName: u.displayName, 
            createdAt: serverTimestamp(), 
            avatarConfig: { outfit: 'Casual', accessory: 'None' },
            characterProfile: { name: 'Aria', bio: 'Your personal AI life assistant' }
          };
          await setDoc(userRef, defaultConfig);
          setAvatarConfig(defaultConfig.avatarConfig);
          setCharacterProfile(defaultConfig.characterProfile);
        }
      }
    });
  }, []);

  // Firestore Data Listeners
  useEffect(() => {
    if (!user) return;

    const msgsQuery = query(collection(db, 'users', user.uid, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snap) => {
      setMessages(snap.docs.map(d => ({ role: d.data().role as 'user' | 'model', content: d.data().content })));
    });

    const tasksQuery = query(collection(db, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const projectsQuery = query(collection(db, 'users', user.uid, 'projects'), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    return () => { unsubMsgs(); unsubTasks(); unsubProjects(); };
  }, [user]);

  const saveMessage = async (role: 'user' | 'model', content: string) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'messages'), {
      role,
      content,
      timestamp: serverTimestamp()
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    // Save User message
    await saveMessage('user', text);
    setIsTyping(true);

    try {
      if (!chat) return;

      // Get AI Response
      const result = await chat.sendMessage(text);
      let responseText = "";
      try {
        responseText = result.response.text();
      } catch (e) {
        // This is expected if the AI only returned function calls
      }
      const functionCalls = result.response.functionCalls();

      // Handle function calls
      if (functionCalls) {
        for (const call of functionCalls) {
          const { name, args } = call;
          if (name === 'createProject') {
            await addDoc(collection(db, 'users', user.uid, 'projects'), { 
              name: (args as any).name, 
              description: (args as any).description || '',
              createdAt: serverTimestamp() 
            });
          } else if (name === 'addTask') {
            await addDoc(collection(db, 'users', user.uid, 'tasks'), {
              title: (args as any).title,
              description: (args as any).description || '',
              dueDate: (args as any).dueDate || null,
              priority: (args as any).priority || 'medium',
              recurrence: (args as any).recurrence || 'none',
              status: 'pending',
              createdAt: serverTimestamp()
            });
          } else if (name === 'updateAvatar') {
            const newConfig = { 
              outfit: (args as any).outfit || avatarConfig.outfit || 'Casual', 
              accessory: (args as any).accessory || avatarConfig.accessory || 'None' 
            };
            setAvatarConfig(newConfig);
            await updateDoc(doc(db, 'users', user.uid), { avatarConfig: newConfig });
          } else if (name === 'updateProfile') {
            const newProfile = { 
              name: (args as any).name || characterProfile.name, 
              bio: (args as any).bio || characterProfile.bio,
              traits: (args as any).traits || characterProfile.traits
            };
            setCharacterProfile(newProfile);
            await updateDoc(doc(db, 'users', user.uid), { characterProfile: newProfile });
            alert(`${newProfile.name}'s personality has been recalibrated.`);
          }
        }
      }

      // Save AI Response
      if (responseText) {
        await saveMessage('model', responseText);
        
        // Voice Response
        const base64Audio = await getAriaVoice(responseText);
        if (base64Audio) {
           const audio = new Audio("data:audio/wav;base64," + base64Audio);
           audio.play().catch(e => console.error("Audio playback blocked", e));
        }
      }

    } catch (error) {
      console.error("Gemini Error:", error);
      await saveMessage('model', "I'm sorry, I'm having a little trouble connecting to my brain right now. Can you try again?");
    } finally {
      setIsTyping(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
      status: task.status === 'completed' ? 'pending' : 'completed'
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-aria-bg">
        <Sparkles className="animate-spin text-aria-accent w-12 h-12" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-aria-bg p-6">
        <div className="max-w-md w-full glass p-8 rounded-[2rem] text-center space-y-6 border border-white/10 shadow-3xl animate-fade-in">
          <div className="w-20 h-20 bg-aria-accent/20 rounded-full flex items-center justify-center mx-auto ring-8 ring-aria-accent/10">
            <UserIcon className="text-aria-accent w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-serif italic mb-2 aria-glow">Meet Aria</h1>
            <p className="text-white/60 text-sm leading-relaxed">Your personal AI life assistant. Human-like, efficient, and always here for you.</p>
          </div>
          <button 
            onClick={signIn}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-white/90"
          >
             <span>Sign in with Google</span>
          </button>
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Encrypted • Realistic • Private</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row p-0 gap-0 overflow-hidden bg-aria-bg">
      {/* Sidebar: Memory Folders */}
      <aside className="w-full md:w-80 glass flex flex-col p-8 z-20 h-full border-r border-[#000000]/05">
        <div className="font-display italic text-2xl mb-12 text-aria-accent">{characterProfile.name}.ai</div>
        
        <div className="flex flex-col flex-1 min-h-0">
          <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 mb-4 font-bold">Memory Folders</div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <TaskBoard projects={projects} tasks={[]} onToggleTask={toggleTask} hideTasks />
          </div>

          <div className="mt-10">
            <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 mb-4 font-bold">User Identity</div>
            <div className="p-4 bg-aria-bg rounded-2xl flex items-center space-x-3 border border-black/05">
               <img 
                 src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`} 
                 alt="User" 
                 referrerPolicy="no-referrer"
                 className="w-10 h-10 rounded-full border border-aria-accent"
               />
               <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-aria-secondary/60">Stored Knowledge Active</p>
               </div>
               <button onClick={signOut} className="text-aria-secondary/20 hover:text-aria-accent transition-colors">
                  <LogOut size={16} />
               </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Primary Stage: Presence & Chat */}
      <main className="flex-1 relative artistic-main-bg flex flex-col items-center justify-end pb-12">
        {/* Chat Bubble overlaying avatar */}
        <div className="absolute top-[10%] left-0 right-0 px-8 flex justify-center z-10 pointer-events-none">
           <AnimatePresence mode="wait">
             {messages.length > 0 && messages[messages.length - 1].role === 'model' && (
               <motion.div 
                 key={messages.length}
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="bg-white p-6 md:p-8 rounded-[2rem] chat-bubble-shadow max-w-sm md:max-w-md relative font-display italic text-lg md:text-xl text-aria-text pointer-events-auto"
               >
                 "{messages[messages.length - 1].content}"
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Aria Avatar */}
        <div className="flex-1 flex items-center justify-center pt-20">
           <AriaAvatar outfit={avatarConfig.outfit} accessory={avatarConfig.accessory} />
        </div>

        {/* Input Bar */}
        <div className="w-[90%] md:w-[600px] z-20">
           <Chat 
             messages={messages} 
             onSendMessage={handleSendMessage} 
             isTyping={isTyping} 
             minimal
           />
        </div>
      </main>

      {/* Right Rail: Reminders & Closet */}
      <aside className="w-full md:w-[320px] glass flex flex-col p-8 z-20 h-full border-l border-[#000000]/05">
        <div className="flex items-center justify-between mb-8">
           <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 font-bold">Resonance Stats</div>
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className="p-2 hover:bg-black/05 rounded-full transition-colors text-aria-secondary/40 hover:text-aria-accent"
           >
              <Settings size={16} />
           </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 mb-4 font-bold">Important Reminders</div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
             <TaskBoard tasks={tasks} projects={[]} onToggleTask={toggleTask} hideProjects />
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 font-bold">Identity Sync</div>
              <div className="text-[10px] text-aria-accent font-bold">ACCESSORIES</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {['None', 'Glasses', 'Ribbon', 'Hat'].map((acc) => (
                <button 
                  key={acc}
                  onClick={() => handleSendMessage(`Put on your ${acc}`)}
                  className={cn(
                    "p-2 rounded-xl text-[10px] uppercase font-bold transition-all border",
                    avatarConfig.accessory === acc ? "bg-aria-accent text-white border-aria-accent" : "bg-white border-black/05 text-aria-secondary/40 hover:border-aria-accent/30"
                  )}
                >
                  {acc === 'None' ? '×' : acc.slice(0,3)}
                </button>
              ))}
            </div>

            <div className="text-[11px] uppercase tracking-[0.1em] text-aria-secondary/60 mb-4 font-bold">Outfit Matrix</div>
            <div className="grid grid-cols-2 gap-3">
               {[
                 { id: 'Casual', color: '#FFD1DC' },
                 { id: 'Professional', color: '#AEC6CF' },
                 { id: 'Party', color: '#FF8BA7' },
                 { id: 'Cozy', color: '#FDFD96' }
               ].map((o) => (
                 <button 
                   key={o.id}
                   onClick={() => handleSendMessage(`Change into your ${o.id} outfit`)}
                   className={cn(
                     "aspect-square bg-aria-bg rounded-xl flex items-center justify-center border-2 transition-all hover:scale-105 active:scale-95",
                     avatarConfig.outfit === o.id ? "border-aria-accent shadow-lg shadow-aria-accent/10" : "border-transparent"
                   )}
                 >
                    <div style={{ backgroundColor: o.color }} className="w-6 h-6 rounded-md shadow-inner" />
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* Global Modal for Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-8"
            >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative"
               >
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-8 right-8 p-2 hover:bg-black/05 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="font-display italic text-3xl mb-2 text-aria-accent">{characterProfile.name}'s Core</div>
                  <p className="text-xs text-aria-secondary/60 mb-10">Adjust the personality resonance of your assistant.</p>
                  
                  <div className="space-y-8">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-aria-secondary">
                           <span>Serious</span>
                           <span className="text-aria-accent">Playful</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="1" step="0.1"
                          value={characterProfile.traits.playfulness}
                          onChange={(e) => handleSendMessage(`Set your playfulness to ${e.target.value}`)}
                          className="w-full accent-aria-accent"
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-aria-secondary">
                           <span>Casual</span>
                           <span className="text-aria-accent">Formal</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="1" step="0.1"
                          value={characterProfile.traits.formality}
                          onChange={(e) => handleSendMessage(`Set your formality to ${e.target.value}`)}
                          className="w-full accent-aria-accent"
                        />
                     </div>

                     <div className="pt-6 border-t border-black/05">
                        <button 
                          onClick={() => {
                            const newName = prompt("Enter a new name:", characterProfile.name);
                            if (newName) handleSendMessage(`Call yourself ${newName} from now on`);
                          }}
                          className="w-full py-4 bg-aria-bg border border-black/05 rounded-2xl text-xs font-bold hover:bg-aria-accent hover:text-white hover:border-aria-accent transition-all"
                        >
                          RENAME CHARACTER
                        </button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}
