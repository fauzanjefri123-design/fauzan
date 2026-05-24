import { useState, useEffect } from 'react';

export function useSoundPreferences() {
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem('inmarket_sound_enabled') !== 'false'
  );
  
  const [ambienceEnabled, setAmbienceEnabled] = useState(() =>
    localStorage.getItem('inmarket_ambience_enabled') !== 'false'
  );

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('inmarket_sound_enabled', String(newVal));
      return newVal;
    });
  };

  const toggleAmbience = () => {
    setAmbienceEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('inmarket_ambience_enabled', String(newVal));
      return newVal;
    });
  };

  return { 
    soundEnabled, 
    ambienceEnabled, 
    toggleSound, 
    toggleAmbience 
  };
}
