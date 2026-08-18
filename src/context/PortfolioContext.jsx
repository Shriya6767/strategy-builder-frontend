import React, { createContext, useContext, useState, useEffect } from 'react';
import { deletePortfolioAPI } from '../services/api';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ✅ LOAD from localStorage on mount (browser open/refresh)
  useEffect(() => {
    console.log('🔄 PortfolioContext: Loading from localStorage...');
    const savedPortfolios = localStorage.getItem('portfolios');
    
    if (savedPortfolios) {
      try {
        const parsed = JSON.parse(savedPortfolios);
        console.log('✅ PortfolioContext: Loaded from localStorage:', parsed);
        setPortfolios(parsed);
      } catch (error) {
        console.error('❌ Error loading portfolios from localStorage:', error);
        setPortfolios([]);
      }
    } else {
      console.log('ℹ️ PortfolioContext: No portfolios found in localStorage');
      setPortfolios([]);
    }
    
    setIsLoaded(true);
  }, []); // Run once on mount

  // ✅ SAVE to localStorage whenever portfolios change
  useEffect(() => {
    if (isLoaded) {
      console.log('💾 PortfolioContext: Saving to localStorage:', portfolios);
      if (portfolios.length > 0) {
        localStorage.setItem('portfolios', JSON.stringify(portfolios));
      } else {
        // If no portfolios, remove the key
        localStorage.removeItem('portfolios');
      }
    }
  }, [portfolios, isLoaded]);

  // Add a new portfolio with complete data
  const addPortfolio = (portfolio) => {
    console.log('➕ PortfolioContext: Adding portfolio:', portfolio);
    
    const newPortfolio = {
      portfolio_id: portfolio.portfolio_id || portfolio.id,
      portfolio_name: portfolio.portfolio_name || portfolio.name,
      strategies: (portfolio.strategies || []).map(strategy => ({
        // Store complete strategy information
        id: strategy.id || strategy.strategy_id,
        strategy_id: strategy.strategy_id || strategy.id,
        strategy_name: strategy.strategy_name || strategy.name,
        version: strategy.version || 1,
        symbol: strategy.symbol || 'SPXW',
        strategy_type: strategy.strategy_type || 'intraday',
        // Preserve all configuration
        qty: strategy.qty,
        quantity_multiplier: strategy.quantity_multiplier,
        weekdays: strategy.weekdays,
        selectedDTEs: strategy.selectedDTEs,
        selectedBudgetDays: strategy.selectedBudgetDays,
        budgetPct: strategy.budgetPct,
        slippage_percent: strategy.slippage_percent,
        selected: strategy.selected !== undefined ? strategy.selected : true
      })),
      createdAt: portfolio.createdAt || new Date().toISOString()
    };
    
    console.log('✅ PortfolioContext: Portfolio formatted:', newPortfolio);
    setPortfolios(prev => [...prev, newPortfolio]);
    return newPortfolio;
  };

  // Update an existing portfolio
  const updatePortfolio = (portfolioId, updatedData) => {
    console.log('✏️ PortfolioContext: Updating portfolio:', portfolioId, updatedData);
    
    setPortfolios(prev =>
      prev.map(p =>
        p.portfolio_id === portfolioId
          ? { 
              ...p, 
              ...updatedData, 
              // Ensure strategies are properly formatted
              strategies: (updatedData.strategies || p.strategies || []).map(strategy => ({
                id: strategy.id || strategy.strategy_id,
                strategy_id: strategy.strategy_id || strategy.id,
                strategy_name: strategy.strategy_name || strategy.name,
                version: strategy.version || 1,
                symbol: strategy.symbol,
                strategy_type: strategy.strategy_type,
                qty: strategy.qty,
                quantity_multiplier: strategy.quantity_multiplier,
                weekdays: strategy.weekdays,
                selectedDTEs: strategy.selectedDTEs,
                selectedBudgetDays: strategy.selectedBudgetDays,
                budgetPct: strategy.budgetPct,
                slippage_percent: strategy.slippage_percent,
                selected: strategy.selected
              })),
              updatedAt: new Date().toISOString() 
            }
          : p
      )
    );
  };

  // Delete a portfolio
  const deletePortfolio = async (portfolioId) => {
    try {
      console.log('🗑️ PortfolioContext: Deleting portfolio:', portfolioId);
      
      // Call backend API
      const response = await deletePortfolioAPI(portfolioId);
      console.log('✅ Portfolio deleted from backend:', response);
      
      // Update local state and localStorage
      setPortfolios(prev => prev.filter(p => p.portfolio_id !== portfolioId));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete portfolio:', error);
      throw error;
    }
  };

  // Get a single portfolio by ID
  const getPortfolioById = (portfolioId) => {
    return portfolios.find(p => p.portfolio_id === portfolioId);
  };

  // Clear all portfolios
  const clearAllPortfolios = () => {
    console.log('🗑️ PortfolioContext: Clearing all portfolios');
    setPortfolios([]);
    localStorage.removeItem('portfolios');
  };

  const value = {
    portfolios,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    getPortfolioById,
    clearAllPortfolios,
    isLoaded // Expose whether data has been loaded from localStorage
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
