import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Strategy Context - Stores strategy_id, strategy_name, and version
 * 
 * Features:
 * - In-memory storage via React Context (fast access)
 * - Persistent storage via localStorage (survives refresh/reopen)
 * - Auto-loads from localStorage on mount
 * - Auto-syncs to localStorage on updates
 */

// localStorage key for persisting strategy data
const STORAGE_KEY = 'strategy_session_data';

// Create Context
const StrategyContext = createContext(undefined);

/**
 * Strategy Context Provider Component
 * Wraps the app and provides strategy data to all child components
 */
export const StrategyProvider = ({ children }) => {
  console.log('[StrategyContext] Provider initializing...');

  // State: Store current strategy data
  const [strategyData, setStrategyData] = useState({
    strategy_id: null,
    strategy_name: null,
    version: null,
  });

  // State: Track if data has been loaded from localStorage (prevents loops)
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * INITIALIZATION: Load data from localStorage on mount
   * This runs ONCE when the app first loads
   */
  useEffect(() => {
    console.log('🔄'.repeat(50));
    console.log('🔄 [StrategyContext] BROWSER REFRESH/REOPEN DETECTED');
    console.log('🔄 [StrategyContext] Initializing - loading from localStorage...');
    console.log('🔄 localStorage key:', STORAGE_KEY);
    console.log('🔄'.repeat(50));
    
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      console.log('📦 [StrategyContext] Raw localStorage data:', storedData);
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        console.log('✅'.repeat(50));
        console.log('✅ [StrategyContext] SUCCESS! Data restored from localStorage:');
        console.log('✅   🆔 strategy_id:', parsed.strategy_id);
        console.log('✅   📝 strategy_name:', parsed.strategy_name);
        console.log('✅   🔢 version:', parsed.version);
        console.log('✅'.repeat(50));
        
        setStrategyData({
          strategy_id: parsed.strategy_id || null,
          strategy_name: parsed.strategy_name || null,
          version: parsed.version || null,
        });
        
        console.log('💾 [StrategyContext] Context state updated with restored data');
      } else {
        console.log('⚠️'.repeat(50));
        console.log('⚠️ [StrategyContext] No data in localStorage - starting fresh');
        console.log('⚠️ This is normal for first-time users or after clearing cache');
        console.log('⚠️'.repeat(50));
      }
    } catch (error) {
      console.error('❌'.repeat(50));
      console.error('❌ [StrategyContext] ERROR loading from localStorage:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌'.repeat(50));
      // Continue with empty state if localStorage fails
    } finally {
      setIsInitialized(true);
      console.log('🎯 [StrategyContext] Initialization complete - isInitialized = true');
      console.log('🎯 React Context is now ready to use!');
      console.log('═'.repeat(100));
    }
  }, []); // Empty dependency array = runs once on mount

  /**
   * AUTO-SYNC: Save to localStorage whenever strategyData changes
   * This runs after initialization and whenever data is updated
   */
  useEffect(() => {
    // Skip sync during initialization to avoid overwriting localStorage
    if (!isInitialized) {
      return;
    }

    console.log('[StrategyContext] Syncing to localStorage:', strategyData);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategyData));
      console.log('[StrategyContext] ✅ Data synced to localStorage');
    } catch (error) {
      console.error('[StrategyContext] ❌ Error syncing to localStorage:', error);
    }
  }, [strategyData, isInitialized]); // Runs when strategyData changes

  /**
   * UPDATE FUNCTION: Set strategy data (updates Context + localStorage)
   * 
   * @param {string|number|null} strategy_id - Strategy ID
   * @param {string|null} strategy_name - Strategy name
   * @param {number|null} version - Version number
   */
  const updateStrategyData = (strategy_id, strategy_name, version) => {
    console.log('[StrategyContext] 🔄 Updating strategy data:', {
      strategy_id,
      strategy_name,
      version,
    });

    setStrategyData({
      strategy_id: strategy_id || null,
      strategy_name: strategy_name || null,
      version: version || null,
    });

    console.log('[StrategyContext] ✅ Context updated (localStorage will auto-sync)');
  };

  /**
   * CLEAR FUNCTION: Reset strategy data (clears Context + localStorage)
   */
  const clearStrategyData = () => {
    console.log('[StrategyContext] 🗑️ Clearing strategy data...');

    setStrategyData({
      strategy_id: null,
      strategy_name: null,
      version: null,
    });

    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[StrategyContext] ✅ Data cleared from Context and localStorage');
    } catch (error) {
      console.error('[StrategyContext] ❌ Error clearing localStorage:', error);
    }
  };

  /**
   * GET FUNCTION: Manually read from localStorage (useful for debugging)
   * Normally not needed - use strategyData from Context instead
   */
  const getFromLocalStorage = () => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error('[StrategyContext] Error reading from localStorage:', error);
      return null;
    }
  };

  // Context value provided to all children
  const contextValue = {
    // Current strategy data
    strategy_id: strategyData.strategy_id,
    strategy_name: strategyData.strategy_name,
    version: strategyData.version,
    
    // Update function
    updateStrategyData,
    
    // Clear function
    clearStrategyData,
    
    // Manual localStorage read (for debugging)
    getFromLocalStorage,
    
    // Initialization status
    isInitialized,
  };

  return (
    <StrategyContext.Provider value={contextValue}>
      {children}
    </StrategyContext.Provider>
  );
};

/**
 * Custom Hook: useStrategy()
 * Use this in any component to access strategy data
 * 
 * Example:
 * const { strategy_id, strategy_name, version, updateStrategyData } = useStrategy();
 */
export const useStrategy = () => {
  const context = useContext(StrategyContext);
  
  if (context === undefined) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  
  return context;
};

/**
 * USAGE EXAMPLES:
 * 
 * 1. Wrap your app with StrategyProvider:
 *    <StrategyProvider>
 *      <App />
 *    </StrategyProvider>
 * 
 * 2. Use in any component:
 *    const { strategy_id, strategy_name, version, updateStrategyData } = useStrategy();
 * 
 * 3. Update strategy data:
 *    updateStrategyData('123', 'My Strategy', 1);
 * 
 * 4. Clear strategy data:
 *    clearStrategyData();
 * 
 * 5. Read current data:
 *    console.log(strategy_id, strategy_name, version);
 */

export default StrategyContext;
