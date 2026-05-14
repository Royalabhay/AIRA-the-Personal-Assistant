import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface AvatarProps {
  outfit: string;
  accessory: string;
}

const ARIA_BASE_IMAGE = "https://picsum.photos/seed/aria/1024/1024";

// Since we want a realistic image, we'll use the user provided look.
// We'll simulate outfit changes via hue filters and overlays.

export const AriaAvatar: React.FC<AvatarProps> = ({ outfit = 'Casual', accessory = 'None' }) => {
  const safeOutfit = outfit || 'Casual';
  
  const getFilterStyle = () => {
    switch (safeOutfit.toLowerCase()) {
      case 'professional': return 'sepia(0.2) contrast(1.1) brightness(1.05)';
      case 'party': return 'hue-rotate(300deg) saturate(1.2)';
      case 'cozy': return 'sepia(0.4) saturate(0.8) brightness(0.9)';
      default: return 'none'; // Casual
    }
  };

  const getOverlayColor = () => {
    switch (safeOutfit.toLowerCase()) {
      case 'professional': return 'rgba(100, 149, 237, 0.1)';
      case 'party': return 'rgba(255, 20, 147, 0.15)';
      case 'cozy': return 'rgba(255, 165, 0, 0.1)';
      default: return 'transparent'; // Casual
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={safeOutfit}
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="relative w-full h-full flex items-center justify-center p-4"
        >
          {/* Main Realistic Image */}
          <div className="relative max-w-lg w-full aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/20">
            <img 
              src="https://storage.googleapis.com/a1aa/image/VzN6U8EetwR1N6S8EetwR1N6S8EetwR1N6S8EetwR1N6S8Eetw.jpg" 
              alt="Aria AI"
              referrerPolicy="no-referrer"
              style={{ filter: getFilterStyle() }}
              className="w-full h-full object-cover transition-all duration-1000"
            />
            {/* Color Overlay for Outfit Mood */}
            <div 
              className="absolute inset-0 pointer-events-none transition-colors duration-1000"
              style={{ backgroundColor: getOverlayColor() }}
            />
            
            {/* Holographic Sparkles */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"
              />
            </div>
          </div>

          {/* Floating Accessory Status */}
          {accessory !== 'None' && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute top-10 right-10 glass px-4 py-2 rounded-full border border-white/20 text-[10px] uppercase font-bold tracking-widest flex items-center space-x-2"
            >
              <Sparkles size={12} className="text-aria-accent" />
              <span>{accessory} Active</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 text-center z-10">
        <span className="text-[10px] uppercase tracking-widest text-[#594A4E]/60 font-mono bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-black/05">
          Biometric Sync: Stable | Mode: {safeOutfit}
        </span>
      </div>
    </div>
  );
};
