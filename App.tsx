

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext.tsx';
import AuthPage from './components/AuthPage.tsx';
import LeaderboardPage from './components/LeaderboardPage.tsx';
import Header from './components/Header.tsx';
import LobbyPage from './components/LobbyPage.tsx';
import CSGOCaseLobby from './components/games/csgo/CSGOCaseLobby.tsx';
import MysteryBoxLobby from './components/games/mysterybox/MysteryBoxLobby.tsx';
import CSGOGame from './components/games/csgo/CSGOGame.tsx';
import MysteryBoxGame from './components/games/MysteryBoxGame.tsx';
import { allCSGOCases } from './components/games/csgo/data.ts';
import { allMysteryBoxes } from './components/games/mysterybox/data.ts';
import ChickenGame from './components/games/ChickenGame.tsx';
import BlackjackGame from './components/games/BlackjackGame.tsx';
import DoorsGame from './components/games/DoorsGame.tsx';
import DiceGame from './components/games/DiceGame.tsx';
import RouletteGame from './components/games/RouletteGame.tsx';
import CrashGame from './components/games/CrashGame.tsx';
import FlipGame from './components/games/FlipGame.tsx';
import LimboGame from './components/games/LimboGame.tsx';
import KenoGame from './components/games/KenoGame.tsx';
import WheelGame from './components/games/WheelGame.tsx';
import PlinkoGame from './components/games/PlinkoGame.tsx';
import CSGOUpgrader from './components/games/csgo/CSGOUpgrader.tsx';
import CSGOCaseBattlesLobby from './components/games/csgo/CSGOCaseBattlesLobby.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import CloseIcon from './components/icons/CloseIcon.tsx';
import CheckIcon from './components/icons/CheckIcon.tsx';
import Chat from './components/Chat.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import MoneyRainBanner from './components/MoneyRainBanner.tsx';
import { supabase } from './lib/supabaseClient.ts';
import type { Profile, MoneyRain, CSGOInventoryItem, CSGOItem, CSGOBattle, BoxItem, InventoryItem, DailyRewardState } from './types.ts';
import InventoryPage from './components/InventoryPage.tsx';

export type Page = 
  | { name: 'lobby' }
  | { name: 'leaderboard' }
  | { name: 'inventory' }
  | { name: 'csgo-lobby' }
  | { name: 'csgo-case'; id: string }
  | { name: 'csgo-upgrader' }
  | { name: 'csgo-battles-lobby' }
  | { name: 'csgo-battles'; id: string }
  | { name: 'mysterybox-lobby' }
  | { name: 'mysterybox-case'; id: string }
  | { name: 'chicken' }
  | { name: 'blackjack' }
  | { name: 'doors' }
  | { name: 'dice' }
  | { name: 'roulette' }
  | { name: 'crash' }
  | { name: 'flip' }
  | { name: 'limbo' }
  | { name: 'keno' }
  | { name: 'wheel' }
  | { name: 'plinko' };

// --- Daily Reward Helpers & Components ---
const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};
const isYesterday = (d1: Date, d2: Date) => {
    const yesterday = new Date(d2);
    yesterday.setDate(d2.getDate() - 1);
    return isSameDay(d1, yesterday);
};

const DAILY_REWARDS = [
    { day: 1, amount: 10.00, item: null },
    { day: 2, amount: 20.00, item: null },
    { day: 3, amount: 30.00, item: null },
    { day: 4, amount: 50.00, item: null },
    { day: 5, amount: 75.00, item: null },
    { day: 6, amount: 100.00, item: null },
    { day: 7, amount: 250.00, item: { boxId: 'apple-box' } },
];

const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25-2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const DailyRewardModal: React.FC<{ isOpen: boolean; onClose: () => void; onClaim: (day: number, amount: number, item: {boxId: string} | null) => void; streak: number; }> = ({ isOpen, onClose, onClaim, streak }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm daily-reward-backdrop" onClick={onClose}>
            <div className="w-full max-w-4xl daily-reward-modal rounded-lg p-6 sm:p-8" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-yellow-300">Daily Rewards</h2>
                    <p className="text-slate-400">Come back every day to claim bigger rewards!</p>
                </div>
                <div className="grid grid-cols-4 lg:grid-cols-7 gap-4">
                    {DAILY_REWARDS.map(reward => {
                        const status = reward.day < streak ? 'claimed' : reward.day === streak ? 'available' : 'locked';
                        return (
                            <div key={reward.day} className={`daily-reward-card rounded-lg p-3 text-center flex flex-col justify-between h-40 ${status}`}>
                                <p className="font-bold text-sm bg-black/30 rounded-full px-2 py-0.5 mx-auto">Day {reward.day}</p>
                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <p className="font-extrabold text-2xl text-yellow-400">€{reward.amount.toFixed(2)}</p>
                                    {reward.item && <p className="text-xs text-purple-300">+ Mystery Item</p>}
                                </div>
                                {status === 'claimed' && <div className="claimed-checkmark"><CheckIcon className="w-16 h-16"/></div>}
                                {status === 'locked' && <div className="claimed-checkmark"><LockIcon className="w-12 h-12"/></div>}
                                {status === 'available' && <button onClick={() => onClaim(reward.day, reward.amount, reward.item)} className="claim-button w-full py-2 rounded-md text-black font-bold text-sm">Claim</button>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const AnnouncementBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
    <div className="bg-purple-600 text-white text-center p-2 flex items-center justify-center gap-4 relative">
        <p className="font-semibold">{message}</p>
        <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
            <CloseIcon className="w-5 h-5" />
        </button>
    </div>
);

const App: React.FC = () => {
    const { profile, isAdmin, adjustBalance } = useAuth();
    const [page, setPage] = useState<Page>({ name: 'lobby' });
    const [isConsoleVisible, setIsConsoleVisible] = useState(false);
    const [announcement, setAnnouncement] = useState<string | null>(null);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
    const [activeRain, setActiveRain] = useState<MoneyRain | null>(null);
    
    // Daily Reward State
    const [dailyRewardState, setDailyRewardState] = useState<DailyRewardState | null>(null);
    const [isDailyRewardModalOpen, setIsDailyRewardModalOpen] = useState(false);

    // Inventory States
    const [csgoInventory, setCsgoInventory] = useState<CSGOInventoryItem[]>([]);
    const [mysteryBoxInventory, setMysteryBoxInventory] = useState<InventoryItem[]>([]);
    const [activeBattles, setActiveBattles] = useState<CSGOBattle[]>([]);

    const addToCsgoInventory = (items: CSGOItem[]) => {
        const newInventoryItems: CSGOInventoryItem[] = items.map(item => ({
            ...item,
            instanceId: `${item.id}-${Date.now()}-${Math.random()}`
        }));
        setCsgoInventory(prev => [...prev, ...newInventoryItems]);
    };

    const removeFromCsgoInventory = (instanceIds: string[]) => {
        setCsgoInventory(prev => prev.filter(item => !instanceIds.includes(item.instanceId)));
    };
    
    const addToMysteryBoxInventory = (items: BoxItem | BoxItem[]) => {
        const itemsToAdd = Array.isArray(items) ? items : [items];
        setMysteryBoxInventory(prev => {
            const newInventory = [...prev];
            itemsToAdd.forEach(item => {
                const existingItemIndex = newInventory.findIndex(i => i.id === item.id);
                if (existingItemIndex > -1) {
                    newInventory[existingItemIndex] = { ...newInventory[existingItemIndex], quantity: newInventory[existingItemIndex].quantity + 1 };
                } else {
                    newInventory.push({ ...item, quantity: 1 });
                }
            });
            return newInventory;
        });
    };

    const sellFromMysteryBoxInventory = (itemId: number, price: number) => {
        setMysteryBoxInventory(prev => {
            const itemToSell = prev.find(i => i.id === itemId);
            if (!itemToSell) return prev;
            
            if (itemToSell.quantity > 1) {
                return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
            } else {
                return prev.filter(i => i.id !== itemId);
            }
        });
        adjustBalance(price);
    };

    useEffect(() => {
        // Real-time listener for Money Rains
        const rainChannel = supabase.channel('money-rains')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'money_rains' }, (payload) => {
                const newRain = payload.new as MoneyRain;
                if (new Date(newRain.expires_at) > new Date()) {
                    setActiveRain(newRain);
                }
            })
            .subscribe();

        // Real-time listener for Announcements
        const announceChannel = supabase.channel('announcements');
        announceChannel
            .on('broadcast', { event: 'new-announcement' }, ({ payload }) => {
                if (payload.message) {
                    setAnnouncement(payload.message);
                    // Auto-hide after 30 seconds
                    setTimeout(() => setAnnouncement(null), 30000); 
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(rainChannel);
            supabase.removeChannel(announceChannel);
        };
    }, []);
    
    // Daily Rewards Logic
    useEffect(() => {
        if (!profile) return;
        const REWARD_KEY = `daily_reward_${profile.id}`;
        try {
            const savedStateRaw = localStorage.getItem(REWARD_KEY);
            const savedState: DailyRewardState = savedStateRaw ? JSON.parse(savedStateRaw) : { streak: 0, lastClaimedTimestamp: 0 };
            const now = new Date();
            const lastClaimedDate = new Date(savedState.lastClaimedTimestamp);

            if (!isSameDay(now, lastClaimedDate)) {
                let currentStreak = 1; // Default to 1 if it's a new day
                if (isYesterday(lastClaimedDate, now)) {
                    currentStreak = (savedState.streak % 7) + 1;
                }
                const finalState = { ...savedState, streak: currentStreak };
                setDailyRewardState(finalState);
                setIsDailyRewardModalOpen(true);
            } else {
                setDailyRewardState(savedState);
                setIsDailyRewardModalOpen(false);
            }
        } catch (error) {
            console.error("Failed to process daily rewards", error);
            localStorage.removeItem(REWARD_KEY);
        }
    }, [profile?.id]);

    const handleClaimReward = useCallback((day: number, amount: number, item: {boxId: string} | null) => {
        if (!profile) return;
        adjustBalance(amount);
        if (item) {
            const boxToGive = allMysteryBoxes.find(b => b.id === item.boxId);
            if (boxToGive) {
                // Give a random item from the box
                addToMysteryBoxInventory(boxToGive.items[Math.floor(Math.random() * boxToGive.items.length)]);
            }
        }
        
        const newState = { streak: day, lastClaimedTimestamp: Date.now() };
        localStorage.setItem(`daily_reward_${profile.id}`, JSON.stringify(newState));
        setDailyRewardState(newState);
        setIsDailyRewardModalOpen(false);
    }, [profile?.id, adjustBalance, addToMysteryBoxInventory]);


    if (!profile) {
        return <AuthPage />;
    }
    
    const renderPage = () => {
        switch (page.name) {
            case 'lobby':
                return <LobbyPage setPage={setPage} />;
            case 'leaderboard':
                return <LeaderboardPage />;
            case 'inventory':
                 return <InventoryPage 
                           csgoInventory={csgoInventory}
                           mysteryBoxInventory={mysteryBoxInventory}
                           sellFromCsgoInventory={(instanceId: string, price: number) => {
                               removeFromCsgoInventory([instanceId]);
                               adjustBalance(price);
                           }}
                           sellFromMysteryBoxInventory={sellFromMysteryBoxInventory}
                        />;
            case 'csgo-lobby':
                return <CSGOCaseLobby setPage={setPage} addToCsgoInventory={addToCsgoInventory} />;
            case 'csgo-upgrader':
                return <CSGOUpgrader 
                           setPage={setPage}
                           inventory={csgoInventory}
                           addToInventory={addToCsgoInventory}
                           removeFromInventory={removeFromCsgoInventory} 
                       />;
            case 'csgo-battles-lobby':
                 return <CSGOCaseBattlesLobby battles={activeBattles} setBattles={setActiveBattles} setPage={setPage} />;
            case 'csgo-battles':
                 return <CSGOCaseBattlesLobby battles={activeBattles} setBattles={setActiveBattles} setPage={setPage} battleId={page.id} />;
            case 'mysterybox-lobby':
                return <MysteryBoxLobby setPage={setPage} />;
            case 'csgo-case':
                const selectedCase = allCSGOCases.find(c => c.id === page.id);
                if (!selectedCase) {
                    return <div className="text-center p-8 text-white">Case not found. <button onClick={() => setPage({name: 'csgo-lobby'})} className="text-pink-400 underline">Return to lobby.</button></div>;
                }
                return <CSGOGame setPage={setPage} case={selectedCase} addToCsgoInventory={addToCsgoInventory} />;
            case 'mysterybox-case':
                const selectedBox = allMysteryBoxes.find(b => b.id === page.id);
                if (!selectedBox) {
                    return <div className="text-center p-8 text-white">Box not found. <button onClick={() => setPage({name: 'mysterybox-lobby'})} className="text-pink-400 underline">Return to lobby.</button></div>;
                }
                return <MysteryBoxGame onBack={() => setPage({ name: 'mysterybox-lobby' })} box={selectedBox} addToMysteryBoxInventory={addToMysteryBoxInventory} />;
            case 'chicken':
                return <ChickenGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'blackjack':
                return <BlackjackGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'doors':
                return <DoorsGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'dice':
                return <DiceGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'roulette':
                return <RouletteGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'crash':
                return <CrashGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'flip':
                return <FlipGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'limbo':
                return <LimboGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'keno':
                return <KenoGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'wheel':
                return <WheelGame onBack={() => setPage({ name: 'lobby' })} />;
            case 'plinko':
                return <PlinkoGame onBack={() => setPage({ name: 'lobby' })} />;
            default:
                return <LobbyPage setPage={setPage} />;
        }
    }

    return (
        <div className="min-h-screen w-full">
            {activeRain && <MoneyRainBanner rain={activeRain} onClaimed={() => setActiveRain(null)} />}
            {announcement && <AnnouncementBanner message={announcement} onClose={() => setAnnouncement(null)} />}
            
            <Header 
                page={page}
                setPage={setPage} 
                onToggleConsole={() => setIsConsoleVisible(v => !v)}
                onToggleChat={() => setIsChatVisible(v => !v)}
            />
                
            <main className={`transition-all duration-300 ${isChatVisible ? 'md:mr-[350px]' : ''}`}>
                {renderPage()}
            </main>
            
            {isAdmin && <AdminConsole isVisible={isConsoleVisible} />}
            <Chat isVisible={isChatVisible} onClose={() => setIsChatVisible(false)} onProfileClick={setViewingProfile} />
            {viewingProfile && <UserProfileModal userProfile={viewingProfile} onClose={() => setViewingProfile(null)} />}
            
            {dailyRewardState && (
                <DailyRewardModal
                    isOpen={isDailyRewardModalOpen}
                    onClose={() => setIsDailyRewardModalOpen(false)}
                    onClaim={handleClaimReward}
                    streak={dailyRewardState.streak}
                />
            )}
        </div>
    );
};

export default App;