import React, { createContext, useEffect, useState } from 'react';

export interface SearchHistoryEntry {
  id: string; // Unique identifier for deduplication
  type: 'text' | 'image';
  query?: string;
  imageUrl?: string;
  imageId?: string; // For im_id parameter
  timestamp: number;
  filters?: Record<string, any>;
  source: 'url' | 'user'; // Track whether entry came from URL or user action
}

export interface SearchHistoryContextValue {
  history: SearchHistoryEntry[];
  addToHistory: (entry: Omit<SearchHistoryEntry, 'timestamp'>) => (SearchHistoryEntry | undefined);
  clearHistory: () => void;
  // getLatestEntry: () => SearchHistoryEntry | null;
  // updateEntryFilters: (id: string, filters: Record<string, any>) => void;
}

export const SearchHistoryContext = createContext<SearchHistoryContextValue>({
  history: [],
  addToHistory: () => undefined,
  clearHistory: () => {},
  // getLatestEntry: () => null,
  // updateEntryFilters: () => {},
});

const STORAGE_KEY = 'visenze_search_history';
const MAX_HISTORY_ITEMS = 20;

export const SearchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  const addToHistory = (entry: Omit<SearchHistoryEntry, 'timestamp'>): (SearchHistoryEntry | undefined) => {
    console.log('addToHistory', entry);

    let newEntry: SearchHistoryEntry;
    try {
      newEntry = {
        ...entry,
        timestamp: Date.now(),
      };

      setHistory((prevHistory) => {
        const newHistory = [newEntry, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        return newHistory;
      });

      return newEntry;
    } catch (e) {
      console.error('Failed to add search history entry:', e);
      return undefined;
    }
  };

  const clearHistory = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return (
    <SearchHistoryContext.Provider value={{ history, addToHistory, clearHistory }}>
      {children}
    </SearchHistoryContext.Provider>
  );
};
