import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import useAnimatedBalance from '../../hooks/useAnimatedBalance.tsx';
import ArrowLeftIcon from '../icons/ArrowLeftIcon.tsx';
import GameRulesIcon from '../icons/GameRulesIcon.tsx';
import PumpRulesModal from './pump/PumpRulesModal.tsx';
import { useSound } from '../../hooks/useSound.ts';
import WinAnimation from '../WinAnimation.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx"
import { Label } from "../ui/label.tsx"
import { Input } from "../ui/input.tsx"
import { Button } from "../ui/button.tsx"


const MIN_BET = 0.20;
const MAX_BET = 1000.00;
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type GameState = 'config' | 'playing' | 'busted' | 'cashed_out';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const PUMP_DATA: Record<Difficulty, { m: number; wc: number }[]> = {
    Easy: [
        { m: 1.02, wc: 0.96 }, { m: 1.07, wc: 0.92 }, { m: 1.11, wc: 0.88 }, { m: 1.17, wc: 0.84 }, { m: 1.23, wc: 0.80 }, { m: 1.29, wc: 0.76 }, { m: 1.36, wc: 0.72 }, { m: 1.44, wc: 0.68 }, { m: 1.53, wc: 0.64 }, { m: 1.63, wc: 0.60 }, { m: 1.75, wc: 0.56 }, { m: 1.88, wc: 0.52 }, { m: 2.04, wc: 0.48 }, { m: 2.23, wc: 0.44 }, { m: 2.45, wc: 0.40 }, { m: 2.72, wc: 0.36 }, { m: 3.06, wc: 0.32 }, { m: 3.50, wc: 0.28 }, { m: 4.08, wc: 0.24 }, { m: 4.90, wc: 0.20 }, { m: 6.10, wc: 0.16 }, { m: 8.10, wc: 0.12 }, { m: 12.20, wc: 0.08 }, { m: 24.50, wc: 0.04 }
    ],
    Medium: [
        { m: 1.11, wc: 0.88 }, { m: 1.27, wc: 0.77 }, { m: 1.46, wc: 0.66956522 }, { m: 1.69, wc: 0.57826087 }, { m: 1.98, wc: 0.49565217 }, { m: 2.33, wc: 0.42130435 }, { m: 2.76, wc: 0.35478261 }, { m: 3.31, wc: 0.29565217 }, { m: 4.03, wc: 0.2434651 }, { m: 4.95, wc: 0.19782609 }, { m: 6.19, wc: 0.15826087 }, { m: 7.88, wc: 0.12434783 }, { m: 10.25, wc: 0.09565216 }, { m: 13.6, wc: 0.0717751 }, { m: 18, wc: 0.0512675 }, { m: 26.83, wc: 0.03652174 }, { m: 40.25, wc: 0.0243483 }, { m: 64.4, wc: 0.01521739 }, { m: 112, wc: 0.00869565 }, { m: 225.40, wc: 0.00434783 }, { m: 563.50, wc: 0.00173913 }, { m: 2254, wc: 0.000434738 }, { m: 5000, wc: 0.0002 }, { m: 10000, wc: 0.0001 }
    ],
    Hard: [
        { m: 1.23, wc: 0.80 }, { m: 1.55, wc: 0.63333333 }, { m: 1.98, wc: 0.49565217 }, { m: 2.56, wc: 0.383000395 }, { m: 3.36, wc: 0.29181254 }, { m: 4.48, wc: 0.218885940 }, { m: 6.08, wc: 0.16126482 }, { m: 8.41, wc: 0.11646904 }, { m: 11.92, wc: 0.08221344 }, { m: 17.34, wc: 0.05652174 }, { m: 26.01, wc: 0.03768116 }, { m: 40.46, wc: 0.02422360 }, { m: 65, wc: 0.01490683 }, { m: 112.70, wc: 0.00869575 }, { m: 206.60, wc: 0.00474308 }, { m: 413.23, wc: 0.00237541 }, { m: 929.77, wc: 0.00105402 }, { m: 2479.40, wc: 0.00039526 }, { m: 8677.90, wc: 0.00011293 }, { m: 52060, wc: 0.00001882 }, { m: 100000, wc: 0.00001 }, { m: 200000, wc: 0.000005 }, { m: 500000, wc: 0.000002 }, { m: 1000000, wc: 0.000001 }
    ]
};

const Balloon = ({ multiplier, scale, gameState }: { multiplier: number; scale: number, gameState: GameState }) => (
    <div
        className={`relative origin-bottom transition-transform duration-300 ease-out ${gameState === 'busted' ? 'opacity-0' : 'opacity-100'} ${gameState === 'cashed_out' ? 'animate-balloon-cashout' : 'animate-balloon-idle'}`}
        style={{ width: '120px', transform: `scale(${scale})`, '--idle-duration': `${2 + Math.random()}s`} as React.CSSProperties}
    >
        <svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
            <defs>
                <radialGradient id="balloonGloss" cx="50%" cy="50%" r="50%" fx="65%" fy="35%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </radialGradient>
            </defs>
            <path d="M50 0 C 95