import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 loading-screen-bg flex flex-col items-center justify-center z-[9999]">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight animate-pulse-logo">
          <span className="text-pink-400">Pinky</span>
          <span className="text-white">Stake</span>
        </h1>
        <div className="loading-bar"></div>
        <p className="mt-4 text-slate-400 text-sm tracking-widest animate-pulse">CONNECTING...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
