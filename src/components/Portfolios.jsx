import React, { useState } from 'react';
import { FileText, Plus, Search, Upload, MoreVertical } from 'lucide-react';
import CreatePortfolioModal from './CreatePortfolioModal';
import PortfolioDetails from './PortfolioDetails';
import { usePortfolio } from '../context/PortfolioContext';

const Portfolios = ({ onShowToast }) => {
  const { portfolios, deletePortfolio, updatePortfolio, addPortfolio } = usePortfolio();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleCreatePortfolio = () => {
    setIsModalOpen(true);
  };

  const handlePortfolioCreated = (portfolioData) => {
    console.log('✅ Portfolio created:', portfolioData);
    
    // Portfolio is already saved to Context & localStorage by CreatePortfolioModal
    // Construct portfolio object with proper structure for PortfolioDetails
    const newPortfolio = {
      portfolio_id: portfolioData.id,
      portfolio_name: portfolioData.name,
      strategies: (portfolioData.strategies || []).map((strategy, idx) => ({
        id: strategy.id || strategy.strategy_id || idx,
        name: strategy.name || strategy.strategy_name || 'Untitled',
        symbol: strategy.symbol || 'SPXW',
        strategy_type: (strategy.strategy_type || 'intraday').toUpperCase(),
        version: strategy.version || 1
      })),
      createdAt: new Date().toISOString()
    };
    
    console.log('✅ Navigating to Portfolio Details with:', newPortfolio);
    
    // Set as current portfolio to trigger navigation to PortfolioDetails
    setCurrentPortfolio(newPortfolio);
  };

  const handleDeletePortfolio = async (portfolioId, portfolioName, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${portfolioName}"?`)) {
      try {
        await deletePortfolio(portfolioId);
        setOpenMenuId(null);
        console.log('✅ Portfolio deleted successfully');
      } catch (error) {
        alert(`Failed to delete portfolio: ${error.message}`);
        console.error('❌ Delete error:', error);
      }
    }
  };

  const handleBack = () => {
    setCurrentPortfolio(null);
  };

  // Filter portfolios based on search
  const filteredPortfolios = portfolios.filter(portfolio =>
    portfolio.portfolio_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle updating an existing portfolio
  const handleUpdatePortfolio = (updatedPortfolioData) => {
    console.log('📝 Updating portfolio:', updatedPortfolioData);
    try {
      // Use the updatePortfolio method from context
      updatePortfolio(currentPortfolio.portfolio_id, {
        portfolio_name: updatedPortfolioData.name,
        strategies: updatedPortfolioData.strategies,
        startDate: updatedPortfolioData.startDate,
        endDate: updatedPortfolioData.endDate,
        scopeFilter: updatedPortfolioData.scopeFilter,
        qtyMultiplier: updatedPortfolioData.qtyMultiplier,
        dteTab: updatedPortfolioData.dteTab,
        slippage: updatedPortfolioData.slippage,
      });
      
      // Update local state to reflect changes
      setCurrentPortfolio({
        ...currentPortfolio,
        portfolio_name: updatedPortfolioData.name,
        strategies: updatedPortfolioData.strategies,
        startDate: updatedPortfolioData.startDate,
        endDate: updatedPortfolioData.endDate,
        scopeFilter: updatedPortfolioData.scopeFilter,
        qtyMultiplier: updatedPortfolioData.qtyMultiplier,
        dteTab: updatedPortfolioData.dteTab,
        slippage: updatedPortfolioData.slippage,
      });
      
      console.log('✅ Portfolio updated successfully');
      console.log('📅 Updated dates - Start:', updatedPortfolioData.startDate, 'End:', updatedPortfolioData.endDate);
      
      // Show success toast notification
      if (onShowToast) {
        onShowToast('Portfolio Updated', 'success');
      }
    } catch (error) {
      console.error('❌ Error updating portfolio:', error);
      
      // Show error toast notification
      if (onShowToast) {
        onShowToast(`Failed to update portfolio: ${error.message}`, 'error');
      }
    }
  };

  // Handle saving portfolio as new (duplicate with new name)
  const handleSaveAsNew = (portfolioData) => {
    console.log('📝 Saving portfolio as new:', portfolioData);
    try {
      // Generate a unique ID for the new portfolio
      const newPortfolioId = `portfolio_${Date.now()}`;
      
      // Create new portfolio with the custom name from the modal (not adding "(copy)")
      const newPortfolio = addPortfolio({
        portfolio_id: newPortfolioId,
        portfolio_name: portfolioData.name, // Use the name from modal input
        strategies: portfolioData.strategies,
        startDate: portfolioData.startDate,
        endDate: portfolioData.endDate,
        scopeFilter: portfolioData.scopeFilter,
        qtyMultiplier: portfolioData.qtyMultiplier,
        dteTab: portfolioData.dteTab,
        slippage: portfolioData.slippage,
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ Portfolio saved as new:', newPortfolio);
      
      // Navigate to the new portfolio
      setCurrentPortfolio(newPortfolio);
      
      // Show success toast notification
      if (onShowToast) {
        onShowToast('Portfolio saved as new', 'success');
      }
    } catch (error) {
      console.error('❌ Error saving portfolio as new:', error);
      
      // Show error toast notification
      if (onShowToast) {
        onShowToast(`Failed to save portfolio: ${error.message}`, 'error');
      }
    }
  };

  // Show portfolio details if a portfolio is selected
  if (currentPortfolio) {
    return (
      <PortfolioDetails
        portfolioId={currentPortfolio.portfolio_id}
        portfolioName={currentPortfolio.portfolio_name}
        strategies={currentPortfolio.strategies}
        startDate={currentPortfolio.startDate}
        endDate={currentPortfolio.endDate}
        onBack={handleBack}
        onUpdatePortfolio={handleUpdatePortfolio}
        onSaveAsNew={handleSaveAsNew}
        onDeletePortfolio={async () => {
          if (window.confirm(`Are you sure you want to delete "${currentPortfolio.portfolio_name}"?`)) {
            try {
              await deletePortfolio(currentPortfolio.portfolio_id);
              setCurrentPortfolio(null);
              console.log('✅ Portfolio deleted successfully');
            } catch (error) {
              alert(`Failed to delete portfolio: ${error.message}`);
              console.error('❌ Delete error:', error);
            }
          }
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Title and Info */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">My Portfolio</h1>
          </div>
        </div>

        {/* Search Bar and Action Buttons */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search Portfolio */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search Portfolio"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Upload size={16} />
                Import
              </button>
              <button
                onClick={handleCreatePortfolio}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Create new portfolio
              </button>
            </div>
          </div>
        </div>

        {/* Portfolios List or Empty State */}
        {portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 mb-6">
                <FileText size={64} className="text-gray-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No portfolios created yet</h2>
              <p className="text-gray-500 mb-6">Create your first portfolio to get started</p>
              <button 
                onClick={handleCreatePortfolio}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={18} />
                Create new portfolio
              </button>
            </div>
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="text-center">
              <p className="text-gray-500">No portfolios match your search</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Portfolios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPortfolios.map((portfolio) => (
                <div
                  key={portfolio.portfolio_id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-800">
                      {portfolio.portfolio_name}
                    </h3>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === portfolio.portfolio_id ? null : portfolio.portfolio_id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === portfolio.portfolio_id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={(e) => handleDeletePortfolio(portfolio.portfolio_id, portfolio.portfolio_name, e)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3">
                    {/* Strategies Count */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600">Strategies</span>
                      <span className="font-semibold text-gray-800">{portfolio.strategies.length}</span>
                    </div>

                    {/* Strategy Names List */}
                    <div className="space-y-2 mb-3">
                      {portfolio.strategies.slice(0, 3).map((strategy, idx) => (
                        <div key={strategy.strategy_id || strategy.id || idx} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                          <p className="text-sm text-gray-700">{strategy.name || strategy.strategy_name || 'Untitled'}</p>
                        </div>
                      ))}
                      {portfolio.strategies.length > 3 && (
                        <div className="border-t border-gray-100 pt-2">
                          <p className="text-sm text-blue-600">+{portfolio.strategies.length - 3} more</p>
                        </div>
                      )}
                    </div>

                    {/* Created Date */}
                    <p className="text-xs text-gray-500 mb-3">
                      Created {new Date(portfolio.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Card Footer - View Button */}
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        console.log('🔍 View clicked for portfolio:', portfolio);
                        console.log('🔍 Portfolio strategies:', portfolio.strategies);
                        setCurrentPortfolio(portfolio);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreatePortfolio={handlePortfolioCreated}
      />
    </>
  );
};

export default Portfolios;
