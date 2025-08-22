import React from 'react';

interface GiveawayCardProps {
    title: string;
    description: React.ReactNode;
    imageUrl: string;
    requirementText: string;
    timeLeft: number;
    canClaim: boolean;
    hasMetAgeRequirement: boolean;
    onClaim: () => void;
    glowColor?: string;
}

const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours.toString().padStart(2, '0')}h`;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const GiveawayCard: React.FC<GiveawayCardProps> = ({ title, description, imageUrl, requirementText, timeLeft, canClaim, hasMetAgeRequirement, onClaim, glowColor }) => {
    return (
        <div className="giveaway-card" style={{'--glow-color': glowColor} as React.CSSProperties}>
            <p className="giveaway-card-title">{title}</p>
            <div className="text-xs text-slate-400">{description}</div>
            <img src={imageUrl} alt={title} />
            <p className="text-xs text-slate-400">{requirementText}</p>
            {canClaim ? (
                <button onClick={onClaim} className="join-btn mt-2 pulse-on-claim">
                    Claim Now
                </button>
            ) : (
                <div className="join-btn mt-2 opacity-70 cursor-not-allowed flex items-center justify-center">
                    {hasMetAgeRequirement ? (
                       <span className="text-lg font-mono">{formatTime(timeLeft)}</span>
                    ) : (
                        'Requirement not met'
                    )}
                </div>
            )}
        </div>
    );
};

export default GiveawayCard;