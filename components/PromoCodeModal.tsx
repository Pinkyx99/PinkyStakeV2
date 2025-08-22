import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';

const AVAILABLE_CODES = [
    { code: 'FREE5', description: 'Get 5.00 EUR for free!' },
    { code: 'PINKY10', description: 'Get 10.00 EUR bonus!' },
    { code: 'LUCKY7', description: 'Feeling lucky? Get 7.00 EUR!' }
];

const PromoCodeSection: React.FC = () => {
    const { profile } = useAuth();
    const [inputCode, setInputCode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputCode.trim()) return;
        setLoading(true);
        setMessage(null);

        // Stubbed functionality as redeemCode is not implemented in AuthContext
        const result = { success: false, message: "Promo code functionality is currently disabled." };
        
        setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        if (result.success) {
            setInputCode('');
        }
        
        setLoading(false);
        setTimeout(() => setMessage(null), 4000);
    };

    if (!profile) {
        return <div className="text-center text-gray-500">Loading user data...</div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Available Codes</h3>
                <div className="space-y-2">
                    {AVAILABLE_CODES.map(c => (
                        <div key={c.code} className="bg