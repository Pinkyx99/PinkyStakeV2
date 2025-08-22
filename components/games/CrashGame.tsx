import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import useAnimatedBalance from '../../hooks/useAnimatedBalance.tsx';
import ArrowLeftIcon from '../icons/ArrowLeftIcon.tsx';
import SoundOnIcon from '../icons/SoundOnIcon.tsx';
import GameRulesIcon from '../icons/GameRulesIcon.tsx';
import { useSound } from '../../hooks/useSound.ts';
import WinAnimation from '../WinAnimation.tsx';

const MIN_BET = 0.20;
const MAX_BET = 1000.00;
const WAITING_TIME = 7000;
const MULTIPLIER_SPEED = 10000; // Increased to slow down the curve for a smoother feel

type GamePhase = 'waiting' | 'running' | 'crashed';
type Point = { t: number; m: number }; // time, multiplier

type OtherPlayer = {
  id: number;
  name: string;
  avatarUrl: string;
  bet: number;
  cashoutAt: number | null;
  status: 'waiting' | 'playing' | 'cashed_out' | 'lost';
};

const FAKE_USERNAMES = ['RocketMan', 'ToTheMoon', 'DiamondHand', 'CrashKing', 'GambleGod', 'HighRoller', 'LuckyDuck', 'Winner22', 'Player1337', 'Stonks'];
const FAKE_AVATARS = [
    'https://i.imgur.com/s6p4eF8.png',
    'https://i.imgur.com/5J7m1jR.png',
    'https://i.imgur.com/9n9s8Z2.png',
    'https://i.imgur.com/cO1k2L4.png',
    'https://i.imgur.com/z1kH0B5.png',
];

const CrashGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { profile, adjustBalance } = useAuth();
    const [phase, setPhase] = useState<GamePhase>('waiting');
    const [countdown, setCountdown] = useState(WAITING_TIME / 1000);
    const [multiplier, setMultiplier] = useState(1.00);
    const [winData, setWinData] = useState<{ amount: number; key: number } | null>(null);

    const [betAmount, setBetAmount] = useState(5.00);
    const [betInput, setBetInput] = useState('5.00');
    
    const [queuedBet, setQueuedBet] = useState<number | null>(null);
    const [activeBet, setActiveBet] = useState<number | null>(null);
    const [cashedOutMultiplier, setCashedOutMultiplier] = useState<number | null>(null);
    
    const [history, setHistory] = useState([2.70, 6.01, 1.34, 11.92, 1.01, 3.08, 2.48, 1.36, 4.56, 1.98, 1.55, 1.23]);
    const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
    
    const animatedBalance = useAnimatedBalance(profile?.balance ?? 0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const crashPointRef = useRef(1.0);
    const pathRef = useRef<Point[]>([{t: 0, m: 1.0}]);
    
    const isMounted = useRef(true);
    const phaseRef = useRef(phase);
    const { playSound } = useSound();

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
    useEffect(() => { setBetInput(betAmount.toFixed(2)); }, [betAmount]);
    useEffect(() => { phaseRef.current = phase }, [phase]);
    
    const handleBetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setBetInput(e.target.value);
    const handleBetInputBlur = () => {
        let value = parseFloat(betInput);
        if (isNaN(value) || value < MIN_BET) value = MIN_BET;
        else if (value > MAX_BET) value = MAX_BET;
        setBetAmount(value);
    };

    const handleCashout = useCallback(() => {
        if (phase !== 'running' || !activeBet || cashedOutMultiplier) return;
        
        const winnings = activeBet * multiplier;
        const netWinnings = winnings - activeBet;
        if (netWinnings > 0) {
            setWinData({ amount: netWinnings, key: Date.now() });
        }
        adjustBalance(winnings);
        playSound('cashout');

        if (isMounted.current) {
            setCashedOutMultiplier(multiplier);
        }
    }, [phase, activeBet, cashedOutMultiplier, multiplier, adjustBalance, playSound]);
    
    const handleBetButton = async () => {
        if (phase !== 'waiting') return;
        
        if (queuedBet) { // Cancel bet
            playSound('click');
            await adjustBalance(queuedBet);
            if (isMounted.current) setQueuedBet(null);
        } else { // Place bet
            if (profile && profile.balance >= betAmount) {
                playSound('bet');
                await adjustBalance(-betAmount);
                if (isMounted.current) setQueuedBet(betAmount);
            }
        }
    };
    
    const generateCrashPoint = () => {
        const r = Math.random();
        const crashPoint = 0.99 / r;
        const result = Math.min(1_000_000, Math.max(1.00, crashPoint));
        return Math.floor(result * 100) / 100;
    };


    useEffect(() => {
        let timerId: ReturnType<typeof setTimeout> | undefined;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        if (phase === 'waiting') {
            pathRef.current = [{t: 0, m: 1.0}];
            setMultiplier(1.00);
            setCashedOutMultiplier(null);
            setActiveBet(null);
            setCountdown(WAITING_TIME / 1000);
            
            const numPlayers = Math.floor(Math.random() * 8) + 5;
            const newPlayers: OtherPlayer[] = Array.from({ length: numPlayers }).map((_, i) => ({
                id: i,
                name: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)] + (Math.floor(Math.random() * 900) + 100),
                avatarUrl: FAKE_AVATARS[Math.floor(Math.random() * FAKE_AVATARS.length)],
                bet: parseFloat((Math.random() * 50 + 1).toFixed(2)),
                cashoutAt: null,
                status: 'waiting',
            }));
            setOtherPlayers(newPlayers);

            intervalId = setInterval(() => setCountdown(c => Math.max(0, c - 0.1)), 100);
            timerId = setTimeout(() => { if (isMounted.current) setPhase('running'); }, WAITING_TIME);
        } else if (phase === 'running') {
            crashPointRef.current = generateCrashPoint();
            pathRef.current = [];
            startTimeRef.current = performance.now();
            if (queuedBet) { setActiveBet(queuedBet); setQueuedBet(null); }

            const playersWithCashouts = otherPlayers.map(p => {
                if (Math.random() < 0.25) return { ...p, status: 'playing' as const };
                const r = Math.random();
                const cashoutPoint = 1.01 + Math.pow(r, 2.5) * (crashPointRef.current * 0.95 - 1.01);
                return { ...p, cashoutAt: Math.max(1.01, cashoutPoint), status: 'playing' as const };
            });
            setOtherPlayers(playersWithCashouts);

            playersWithCashouts.forEach(player => {
                if (player.cashoutAt) {
                    const cashoutTimeMs = MULTIPLIER_SPEED * Math.log(player.cashoutAt);
                    setTimeout(() => {
                        if (isMounted.current && phaseRef.current === 'running') {
                            setOtherPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: 'cashed_out' } : p));
                        }
                    }, cashoutTimeMs);
                }
            });
            let animationFrameId: number;
            const gameLoop = (timestamp: number) => {
                if (!isMounted.current || phaseRef.current !== 'running' || !startTimeRef.current) return;
                const elapsedTime = timestamp - startTimeRef.current;
                const currentMultiplier = Math.max(1, Math.exp(elapsedTime / MULTIPLIER_SPEED));
                pathRef.current.push({ t: elapsedTime, m: currentMultiplier });
                if (currentMultiplier >= crashPointRef.current) {
                    if (isMounted.current) {
                        playSound('crash_explode');
                        setMultiplier(crashPointRef.current);
                        setPhase('crashed');
                    }
                } else {
                    if (isMounted.current) setMultiplier(currentMultiplier);
                    animationFrameId = requestAnimationFrame(gameLoop);
                }
            };
            animationFrameId = requestAnimationFrame(gameLoop);
            return () => { cancelAnimationFrame(animationFrameId); };

        } else if (phase === 'crashed') {
            setOtherPlayers(prev => prev.map(p => (p.status === 'playing' ? { ...p, status: 'lost' } : p)));
            if (activeBet && !cashedOutMultiplier) playSound('lose');
            setHistory(prev => [multiplier, ...prev].slice(0, 10));
            timerId = setTimeout(() => { if (isMounted.current) setPhase('waiting'); }, 3000);
        }

        return () => { clearTimeout(timerId); clearInterval(intervalId); };
    }, [phase, queuedBet, activeBet, cashedOutMultiplier, adjustBalance, playSound, multiplier]);

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const { width, height } = canvas;
        const path = pathRef.current;
        const lastPoint = path[path.length - 1] || { t: 0, m: 1 };
        const maxTime = Math.max(3000, lastPoint.t * 1.2);
        const maxMultiplier = Math.max(2, lastPoint.m * 1.2);
        const timeToX = (t: number) => (t / maxTime) * width / dpr;
        const multToY = (m: number) => height / dpr - ((Math.log(m)) / Math.log(maxMultiplier)) * height / dpr;
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4; ctx.beginPath();
        if (path.length > 0) ctx.moveTo(timeToX(path[0].t), multToY(path[0].m));
        for (let i = 1; i < path.length; i++) ctx.lineTo(timeToX(path[i].t), multToY(path[i].m));
        ctx.stroke();
    }, [multiplier, phase]);

    const buttonText = phase === 'waiting' ? (queuedBet ? 'Cancel Bet' : 'Place Bet') : (cashedOutMultiplier ? `Cashed Out @${cashedOutMultiplier.toFixed(2)}x` : 'Cashout');
    const buttonColor = phase === 'waiting' ? (queuedBet ? 'bg-red-600' : 'bg-green-500') : (cashedOutMultiplier ? 'bg-gray-500' : 'bg-yellow-500');

    return (
        <div className="bg-[#0f1124] h-screen flex flex-col font-poppins text-white select-none">
            {winData && <WinAnimation key={winData.key} amount={winData.amount} onComplete={() => setWinData(null)} />}
            <header className="flex items-center justify-between p-3 bg-[#1a1b2f]">
                <div className="flex-1"><button onClick={onBack}><ArrowLeftIcon className="w-6 h-6"/></button></div>
                <div className="flex-1 text-center text-xl font-bold uppercase text-purple-400">Crash</div>
                <div className="flex-1 flex justify-end items-center bg-black/30 rounded-md px-4 py-1.5"><span className="text-lg font-bold text-yellow-400">{animatedBalance.toFixed(2)}</span><span className="text-sm text-gray-400 ml-2">EUR</span></div>
            </header>
            <div className="w-full px-4 py-2 flex items-center gap-2 overflow-x-auto bg-slate-800/50">
                {history.map((h,i) => <div key={i} className={`px-3 py-1 text-sm rounded-full font-semibold ${h > 1.9 ? 'text-green-300' : 'text-red-400'}`}>{h.toFixed(2)}x</div>)}
            </div>
            <div className="flex-grow flex p-4 gap-4">
                <aside className="w-64 bg-slate-800/50 rounded-lg p-2 flex flex-col gap-2 overflow-y-auto">
                    {otherPlayers.map(p=><div key={p.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${p.status==='cashed_out'?'bg-green-500/10':p.status==='lost'?'bg-red-500/10':''}`}><img src={p.avatarUrl} className="w-6 h-6 rounded-full"/><span className="font-semibold flex-grow truncate">{p.name}</span><span className="font-bold">{p.status==='cashed_out'?`${p.cashoutAt?.toFixed(2)}x`:`$${p.bet.toFixed(2)}`}</span></div>)}
                </aside>
                <main className="flex-grow flex flex-col relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        {phase === 'waiting' && <p className="text-5xl font-bold text-slate-500">Starts in {countdown.toFixed(1)}s</p>}
                        {phase === 'running' && <p className="text-7xl font-bold text-purple-400 animate-pulse">{multiplier.toFixed(2)}x</p>}
                        {phase === 'crashed' && <p className="text-7xl font-bold text-red-500">Crashed @{multiplier.toFixed(2)}x</p>}
                    </div>
                    <div className="flex-grow"><canvas ref={canvasRef} className="w-full h-full"/></div>
                    <div className="shrink-0 h-40 bg-slate-800/50 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-around">
                        <div className="flex items-center gap-2">
                            <input type="text" value={betInput} onChange={handleBetInputChange} onBlur={handleBetInputBlur} className="w-32 bg-slate-700 p-3 rounded-md font-bold text-lg text-center"/>
                            <div><button onClick={()=>setBetAmount(v=>Math.max(MIN_BET, v/2))} className="px-2 py-1 bg-slate-600 rounded">1/2</button><button onClick={()=>setBetAmount(v=>Math.min(MAX_BET, v*2))} className="px-2 py-1 bg-slate-600 rounded ml-1">2x</button></div>
                        </div>
                        <button onClick={phase === 'running' ? handleCashout : handleBetButton} disabled={phase === 'crashed' || (phase==='running'&&!activeBet) || (phase==='waiting'&&(!profile||profile.balance<betAmount&&!queuedBet))} className={`w-48 h-16 text-2xl font-bold rounded-md transition-colors ${buttonColor} disabled:bg-gray-600`}>{buttonText}</button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CrashGame;
