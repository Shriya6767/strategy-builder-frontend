import React from 'react';
import { Info, Copy, Trash2 } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import StrikeSelector from './StrikeSelector';

// Changed: Receives specific data instead of full config - prevents re-renders when unrelated config fields change
// All direct setConfig calls replaced with updateLegInPlace for better performance
const LegCard = ({
  leg,
  legIndex,
  mainLegNumber,
  allLegs, // Changed: from config.legs
  strategyType, // Changed: from config.strategy_type
  dteFilter, // Changed: from config.dte_filter
  updateLegInPlace,
  duplicateLeg, // Changed: added memoized handler
  removeLeg,
  setResponsePopup,
  legValidationErrors,
  setLegValidationErrors,
  lazyLegDropdownOpen,
  setLazyLegDropdownOpen,
  lazyLegExistingExpanded,
  setLazyLegExistingExpanded,
  lazyLegDropdownRef,
  setLazyLegConfig,
  setLazyLegContext,
  setShowLazyLegModal,
  setSequentialLegParentIndex,
  setShowSequentialLegModal,
}) => {
  return (
    <div className="w-full bg-white rounded-lg shadow-xl border border-white overflow-visible mb-8 pb-6 animate-fade-in">
      {/* Header */}
      <div className="px-6 bg-white border-b border-gray-300" style={{ paddingTop: '25px', paddingBottom: '25px' }}>
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold uppercase" style={{ color: '#4682b4' }}>
            {leg.isSequentialLeg
              ? (leg.customName || `SEQ#${leg.sequentialLegNumber}`)
              : leg.isLazyLeg
                ? (leg.customName || `Lazy Leg #${leg.lazyLegNumber}`)
                : `LEG#${mainLegNumber}`}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => duplicateLeg(legIndex, leg)}
              disabled={leg.isSequentialLeg}
              className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-100 hover:scale-125 active:scale-90 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={leg.isSequentialLeg ? "Cannot duplicate sequential legs" : "Duplicate leg"}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => removeLeg(leg.id)}
              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:scale-125 active:scale-90 rounded transition-all duration-200"
              title="Remove leg"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8" style={{
        paddingLeft: '25px',
        paddingRight: '25px',
        paddingTop: '26px',
        paddingBottom: strategyType === 'sequential' && !leg.isLazyLeg && !leg.isSequentialLeg ? '30px' : '26px'
      }}>
        {/* Row 1: Total Lot / Expiry / Position / Option Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700 mb-1">Total Lot</label>
            <input
              type="number"
              min="0"
              step="1"
              value={leg.lots}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0) {
                  setResponsePopup({ type: 'error', title: 'Total Lot cannot be negative' });
                  return;
                }
                updateLegInPlace(legIndex, { lots: val });
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700 mb-1">Expiry</label>
            <select
              value={leg.expiry}
              onChange={(e) => updateLegInPlace(legIndex, { expiry: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="0dte">0DTE</option>
              <option value="1dte">1DTE</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700 mb-1">Position</label>
            <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => updateLegInPlace(legIndex, { position: 'buy' })}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${leg.position === 'buy' ? 'text-white shadow-sm' : 'bg-transparent text-gray-600'}`}
                style={leg.position === 'buy' ? { backgroundColor: '#4682b4' } : {}}
              >
                Buy
              </button>
              <button
                onClick={() => updateLegInPlace(legIndex, { position: 'sell' })}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${leg.position === 'sell' ? 'text-white shadow-sm' : 'bg-transparent text-gray-600'}`}
                style={leg.position === 'sell' ? { backgroundColor: '#4682b4' } : {}}
              >
                Sell
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700 mb-1">Option Type</label>
            <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => updateLegInPlace(legIndex, { option_type: 'call' })}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${leg.option_type === 'call' ? 'text-white shadow-sm' : 'bg-transparent text-gray-600'}`}
                style={leg.option_type === 'call' ? { backgroundColor: '#4682b4' } : {}}
              >
                Call
              </button>
              <button
                onClick={() => updateLegInPlace(legIndex, { option_type: 'put' })}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${leg.option_type === 'put' ? 'text-white shadow-sm' : 'bg-transparent text-gray-600'}`}
                style={leg.option_type === 'put' ? { backgroundColor: '#4682b4' } : {}}
              >
                Put
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Strike Criteria / Nearest (or ATM Strike) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              Strike Criteria
              <Info size={12} className="text-slate-400" />
            </label>
            <select
              value={leg.strike_criteria}
              onChange={(e) => updateLegInPlace(legIndex, { strike_criteria: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-semibold text-gray-700 hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="based on points">Based On Strike</option>
              <option value="based on atm percent">Based On ATM %</option>
              <option value="based on premium range">Based On premium range</option>
              <option value="closest premium">Based On Closest Premium</option>
            </select>
          </div>

          {leg.strike_criteria === 'closest premium' && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Nearest</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.closest_premium_value ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Nearest value cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { closest_premium_value: val });
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="0.00"
              />
            </div>
          )}

          {leg.strike_criteria === 'based on points' && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
              <StrikeSelector
                value={leg.strike_type || 'atm'}
                onChange={(value) => updateLegInPlace(legIndex, { strike_type: value })}
              />
            </div>
          )}

          {leg.strike_criteria === 'based on atm percent' && (
            <div className="flex gap-2 items-end">
              <div className="flex flex-col" style={{ width: '30%' }}>
                <label className="text-xs font-semibold text-slate-700 mb-1">ATM</label>
                <select
                  value={leg.atm_percent_direction || '+'}
                  onChange={(e) => updateLegInPlace(legIndex, { atm_percent_direction: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-slate-700 mb-1">%</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={leg.atm_percent_value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== '' && Number(val) < 0) {
                        setResponsePopup({ type: 'error', title: 'ATM % value cannot be negative' });
                        return;
                      }
                      updateLegInPlace(legIndex, { atm_percent_value: val });
                    }}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">%</span>
                </div>
              </div>
            </div>
          )}

          {leg.strike_criteria === 'based on premium range' && (
            <div className="flex gap-5">
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-slate-700 mb-1">Lower Range</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={leg.lower_range ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Lower Range cannot be negative' });
                      return;
                    }
                    updateLegInPlace(legIndex, { lower_range: val });
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-slate-700 mb-1">Upper Range</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={leg.upper_range ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Upper Range cannot be negative' });
                      return;
                    }
                    updateLegInPlace(legIndex, { upper_range: val });
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {(leg.strike_criteria === 'premium_gte' || leg.strike_criteria === 'premium_lte') && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Premium</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.premium_value ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Premium cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { premium_value: val });
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Target / Stop Loss / Trail SL */}
      {(strategyType !== 'sequential' || leg.isSequentialLeg) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Target</label>
              <ToggleSwitch
                checked={leg.target_enabled || false}
                onChange={(e) => updateLegInPlace(legIndex, { target_enabled: e.target.checked })}
                id={`target-${legIndex}`}
              />
            </div>
            <div className="flex gap-2">
              <select value={leg.target_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { target_mode: e.target.value })} disabled={!leg.target_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                <option value="points">Points</option>
                <option value="percentage">Percentage</option>
                <option value="underlying_points">Underlying Points</option>
                <option value="underlying_percentage">Underlying Percentage</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.target_value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Target value cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { target_value: val });
                }}
                disabled={!leg.target_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Stop Loss</label>
              <ToggleSwitch
                checked={leg.stop_loss_enabled || false}
                onChange={(e) => updateLegInPlace(legIndex, { stop_loss_enabled: e.target.checked })}
                id={`stopLoss-${legIndex}`}
              />
            </div>
            <div className="flex gap-2">
              <select value={leg.stop_loss_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { stop_loss_mode: e.target.value })} disabled={!leg.stop_loss_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                <option value="points">Points</option>
                <option value="percentage">Percentage</option>
                <option value="underlying_points">Underlying Points</option>
                <option value="underlying_percentage">Underlying Percentage</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.stop_loss_value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Stop Loss value cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { stop_loss_value: val });
                }}
                disabled={!leg.stop_loss_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Trail SL</label>
              <Info size={14} className="text-gray-400" />
              <ToggleSwitch
                checked={leg.trail_enabled || false}
                onChange={(e) => {
                  if (e.target.checked && !leg.stop_loss_enabled) {
                    setResponsePopup({ type: 'error', title: `Leg #${legIndex + 1} Stop Loss must be selected first.` });
                    return;
                  }
                  updateLegInPlace(legIndex, { trail_enabled: e.target.checked });
                }}
                id={`trailSL-${legIndex}`}
              />
            </div>
            <div className="flex gap-2">
              <select value={leg.trail_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { trail_mode: e.target.value })} disabled={!leg.trail_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                <option value="points">Points</option>
                <option value="percentage">Percentage</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.trail_value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Trail value cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { trail_value: val });
                }}
                disabled={!leg.trail_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="0.00"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={leg.trail_lock_value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) {
                    setResponsePopup({ type: 'error', title: 'Trail lock value cannot be negative' });
                    return;
                  }
                  updateLegInPlace(legIndex, { trail_lock_value: val });
                }}
                disabled={!leg.trail_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      )}

      {/* Row 4: Re-Entry On Target / Re-Entry On SL / Simple Momentum / Range Break Out / Add Sequential Button */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${strategyType === 'sequential' && !leg.isLazyLeg && !leg.isSequentialLeg ? 'mb-2' : 'mt-6'}`}>
        {(strategyType !== 'sequential' || leg.isSequentialLeg) && (
          <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Re-Entry On Target</label>
              <ToggleSwitch
                checked={leg.reentry_tgt_enabled || false}
                onChange={(e) => {
                  if (e.target.checked && !leg.target_enabled) {
                    setResponsePopup({ type: 'error', title: `Leg #${legIndex + 1} Target must be selected first.` });
                    return;
                  }
                  if (!e.target.checked) {
                    setLazyLegDropdownOpen(prev => ({ ...prev, [`tgt-${legIndex}`]: false }));
                  }
                  updateLegInPlace(legIndex, { reentry_tgt_enabled: e.target.checked });
                }}
                id={`reentryTarget-${legIndex}`}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={(leg.reentry_tgt_mode === 'lazy_leg' || leg.reentry_tgt_mode?.startsWith('lazy_leg_')) ? 'lazy_leg' : (leg.reentry_tgt_mode || 're_cost')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'lazy_leg') {
                    updateLegInPlace(legIndex, { reentry_tgt_mode: 'lazy_leg' });
                    setLazyLegDropdownOpen(prev => ({ ...prev, [`tgt-${legIndex}`]: true }));
                  } else {
                    updateLegInPlace(legIndex, { reentry_tgt_mode: value });
                  }
                }}
                disabled={!leg.reentry_tgt_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              >
                <option value="re_cost">RE COST</option>
                <option value="re_asap">RE ASAP</option>
                <option value="re_asap_reverse">RE ASAP REV</option>
                <option value="re_momentum" disabled={!leg.momentum_enabled}>RE MOMENTUM</option>
                <option value="re_momentum_reverse" disabled={!leg.momentum_enabled}>RE MOMENTUM REV</option>
                <option value="re_cost_reverse">RE COST REV</option>
                {!leg.isSequentialLeg && <option value="lazy_leg">Lazy Leg</option>}
              </select>

              {!leg.isSequentialLeg && (leg.reentry_tgt_mode === 'lazy_leg' || leg.reentry_tgt_mode?.startsWith('lazy_leg_')) && (
                <div
                  className="relative flex-1 min-w-0 overflow-visible"
                  ref={(el) => lazyLegDropdownRef.current[`tgt-${legIndex}`] = el}
                  style={{ zIndex: lazyLegDropdownOpen[`tgt-${legIndex}`] ? 100 : 'auto' }}
                >
                  <button
                    type="button"
                    onClick={() => setLazyLegDropdownOpen(prev => ({ ...prev, [`tgt-${legIndex}`]: !prev[`tgt-${legIndex}`] }))}
                    disabled={!leg.reentry_tgt_enabled}
                    className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 text-left flex items-center justify-between"
                  >
                    <span>
                      {(() => {
                        const referencedLazyLeg = allLegs.find(l => `lazy_leg_${l.id}` === leg.reentry_tgt_mode);
                        if (referencedLazyLeg) {
                          return referencedLazyLeg.customName || `lazy${referencedLazyLeg.lazyLegNumber}`;
                        }
                        return 'Select Lazy Leg';
                      })()}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {lazyLegDropdownOpen[`tgt-${legIndex}`] && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLazyLegConfig({
                            customName: '', lots: '1', expiry: dteFilter === '0' ? '0dte' : '1dte',
                            position: 'buy', option_type: 'call', strike_criteria: 'based on points',
                            atm_strike: 'atm', atm_percent_direction: '+', atm_percent_value: '',
                            closest_premium_value: '', lower_range: '', upper_range: '', premium_value: '',
                            target_enabled: false, target_type: 'points', target_value: '',
                            stop_loss_enabled: false, stop_loss_type: 'points', stop_loss_value: '',
                            trail_sl_enabled: false, trail_sl_type: 'points', trail_sl_value: '', trail_sl_lock_value: '',
                            reentry_tgt_enabled: false, reentry_tgt_mode: 're_cost', reentry_tgt_count: '',
                            reentry_sl_enabled: false, reentry_sl_mode: 're_cost', reentry_sl_count: '',
                            momentum_enabled: false, momentum_type: 'points_up', momentum_value: '',
                            range_breakout_enabled: false, range_instrument: 'underlying', range_time: '14:45', range_direction: 'high'
                          });
                          setLazyLegContext({ legIndex, type: 'target' });
                          setShowLazyLegModal(true);
                          setLazyLegDropdownOpen(prev => ({ ...prev, [`tgt-${legIndex}`]: false }));
                        }}
                        className="w-full px-4 py-2 text-left text-white font-medium hover:opacity-90 transition-colors flex items-center gap-2"
                        style={{ backgroundColor: '#4682b4' }}
                      >
                        <span>+</span>
                        <span>Create New</span>
                      </button>

                      <div className="px-4 py-2 text-center text-sm text-gray-500">OR</div>

                      <button
                        type="button"
                        onClick={() => setLazyLegExistingExpanded(prev => ({ ...prev, [`tgt-${legIndex}`]: !prev[`tgt-${legIndex}`] }))}
                        className="w-full px-4 py-2 text-left text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <span>Select from existing</span>
                        <svg className={`w-4 h-4 transition-transform ${lazyLegExistingExpanded[`tgt-${legIndex}`] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {lazyLegExistingExpanded[`tgt-${legIndex}`] && (
                        <div className="border-t border-gray-200">
                          {allLegs.filter(l => (!leg.isLazyLeg ? l.isLazyLeg : (l.isLazyLeg && l.id !== leg.id))).map(lazyLeg => (
                            <button
                              key={lazyLeg.id}
                              type="button"
                              onClick={() => {
                                updateLegInPlace(legIndex, { reentry_tgt_mode: `lazy_leg_${lazyLeg.id}` });
                                setLazyLegDropdownOpen(prev => ({ ...prev, [`tgt-${legIndex}`]: false }));
                              }}
                              className="w-full px-6 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
                            >
                              {lazyLeg.customName || `lazy${lazyLeg.lazyLegNumber}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!(leg.reentry_tgt_mode === 'lazy_leg' || leg.reentry_tgt_mode?.startsWith('lazy_leg_')) && (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={leg.reentry_tgt_count ?? '0'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && val.includes('.')) {
                      setResponsePopup({ type: 'error', title: 'Re-Entry count must be a whole number' });
                      return;
                    }
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Re-Entry count cannot be negative' });
                      return;
                    }
                    updateLegInPlace(legIndex, { reentry_tgt_count: val });
                  }}
                  disabled={!leg.reentry_tgt_enabled}
                  className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="1.00"
                />
              )}
            </div>
          </div>
        )}

        {(strategyType !== 'sequential' || leg.isSequentialLeg) && (
          <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Re-Entry On SL</label>
              <ToggleSwitch
                checked={leg.reentry_sl_enabled || false}
                onChange={(e) => {
                  if (e.target.checked && !leg.stop_loss_enabled) {
                    setResponsePopup({ type: 'error', title: `Leg #${legIndex + 1} Stop Loss must be selected first.` });
                    return;
                  }
                  if (!e.target.checked) {
                    setLazyLegDropdownOpen(prev => ({ ...prev, [`sl-${legIndex}`]: false }));
                  }
                  updateLegInPlace(legIndex, { reentry_sl_enabled: e.target.checked });
                }}
                id={`reentrySL-${legIndex}`}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={(leg.reentry_sl_mode === 'lazy_leg' || leg.reentry_sl_mode?.startsWith('lazy_leg_')) ? 'lazy_leg' : (leg.reentry_sl_mode || 're_cost')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'lazy_leg') {
                    updateLegInPlace(legIndex, { reentry_sl_mode: 'lazy_leg' });
                    setLazyLegDropdownOpen(prev => ({ ...prev, [`sl-${legIndex}`]: true }));
                  } else {
                    updateLegInPlace(legIndex, { reentry_sl_mode: value });
                  }
                }}
                disabled={!leg.reentry_sl_enabled}
                className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              >
                <option value="re_cost">RE COST</option>
                <option value="re_asap">RE ASAP</option>
                <option value="re_asap_reverse">RE ASAP REV</option>
                <option value="re_momentum" disabled={!leg.momentum_enabled}>RE MOMENTUM</option>
                <option value="re_momentum_reverse" disabled={!leg.momentum_enabled}>RE MOMENTUM REV</option>
                <option value="re_cost_reverse">RE COST REV</option>
                {!leg.isSequentialLeg && <option value="lazy_leg">Lazy Leg</option>}
              </select>

              {!leg.isSequentialLeg && (leg.reentry_sl_mode === 'lazy_leg' || leg.reentry_sl_mode?.startsWith('lazy_leg_')) && (
                <div
                  className="relative flex-1 min-w-0 overflow-visible"
                  ref={(el) => lazyLegDropdownRef.current[`sl-${legIndex}`] = el}
                  style={{ zIndex: lazyLegDropdownOpen[`sl-${legIndex}`] ? 100 : 'auto' }}
                >
                  <button
                    type="button"
                    onClick={() => setLazyLegDropdownOpen(prev => ({ ...prev, [`sl-${legIndex}`]: !prev[`sl-${legIndex}`] }))}
                    disabled={!leg.reentry_sl_enabled}
                    className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 text-left flex items-center justify-between"
                  >
                    <span>
                      {(() => {
                        const referencedLazyLeg = allLegs.find(l => `lazy_leg_${l.id}` === leg.reentry_sl_mode);
                        if (referencedLazyLeg) {
                          return referencedLazyLeg.customName || `lazy${referencedLazyLeg.lazyLegNumber}`;
                        }
                        return 'Select Lazy Leg';
                      })()}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {lazyLegDropdownOpen[`sl-${legIndex}`] && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLazyLegConfig({
                            customName: '', lots: '1', expiry: dteFilter === '0' ? '0dte' : '1dte',
                            position: 'buy', option_type: 'call', strike_criteria: 'based on points',
                            atm_strike: 'atm', atm_percent_direction: '+', atm_percent_value: '',
                            closest_premium_value: '', lower_range: '', upper_range: '', premium_value: '',
                            target_enabled: false, target_type: 'points', target_value: '',
                            stop_loss_enabled: false, stop_loss_type: 'points', stop_loss_value: '',
                            trail_sl_enabled: false, trail_sl_type: 'points', trail_sl_value: '', trail_sl_lock_value: '',
                            reentry_tgt_enabled: false, reentry_tgt_mode: 're_cost', reentry_tgt_count: '',
                            reentry_sl_enabled: false, reentry_sl_mode: 're_cost', reentry_sl_count: '',
                            momentum_enabled: false, momentum_type: 'points_up', momentum_value: '',
                            range_breakout_enabled: false, range_instrument: 'underlying', range_time: '14:45', range_direction: 'high'
                          });
                          setLazyLegContext({ legIndex, type: 'sl' });
                          setShowLazyLegModal(true);
                          setLazyLegDropdownOpen(prev => ({ ...prev, [`sl-${legIndex}`]: false }));
                        }}
                        className="w-full px-4 py-2 text-left text-white font-medium hover:opacity-90 transition-colors flex items-center gap-2"
                        style={{ backgroundColor: '#4682b4' }}
                      >
                        <span>+</span>
                        <span>Create New</span>
                      </button>

                      <div className="px-4 py-2 text-center text-sm text-gray-500">OR</div>

                      <button
                        type="button"
                        onClick={() => setLazyLegExistingExpanded(prev => ({ ...prev, [`sl-${legIndex}`]: !prev[`sl-${legIndex}`] }))}
                        className="w-full px-4 py-2 text-left text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <span>Select from existing</span>
                        <svg className={`w-4 h-4 transition-transform ${lazyLegExistingExpanded[`sl-${legIndex}`] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {lazyLegExistingExpanded[`sl-${legIndex}`] && (
                        <div className="border-t border-gray-200">
                          {allLegs.filter(l => (!leg.isLazyLeg ? l.isLazyLeg : (l.isLazyLeg && l.id !== leg.id))).map(lazyLeg => (
                            <button
                              key={lazyLeg.id}
                              type="button"
                              onClick={() => {
                                updateLegInPlace(legIndex, { reentry_sl_mode: `lazy_leg_${lazyLeg.id}` });
                                setLazyLegDropdownOpen(prev => ({ ...prev, [`sl-${legIndex}`]: false }));
                              }}
                              className="w-full px-6 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
                            >
                              {lazyLeg.customName || `lazy${lazyLeg.lazyLegNumber}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!(leg.reentry_sl_mode === 'lazy_leg' || leg.reentry_sl_mode?.startsWith('lazy_leg_')) && (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={leg.reentry_sl_count ?? '0'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && val.includes('.')) {
                      setResponsePopup({ type: 'error', title: 'Re-Entry count must be a whole number' });
                      return;
                    }
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Re-Entry count cannot be negative' });
                      return;
                    }
                    updateLegInPlace(legIndex, { reentry_sl_count: val });
                  }}
                  disabled={!leg.reentry_sl_enabled}
                  className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="1.00"
                />
              )}
            </div>
          </div>
        )}

        {/* Simple Momentum */}
        <div className="flex flex-col space-y-2 relative" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Simple Momentum</label>
            <Info size={14} className="text-gray-400" />
            <ToggleSwitch
              checked={leg.momentum_enabled || false}
              onChange={(e) => {
                if (e.target.checked && leg.range_enabled) {
                  setLegValidationErrors(prev => ({ ...prev, [`momentum-${legIndex}`]: 'Please disable Range Break Out first.' }));
                  setTimeout(() => {
                    setLegValidationErrors(prev => { const u = { ...prev }; delete u[`momentum-${legIndex}`]; return u; });
                  }, 3000);
                  return;
                }
                setLegValidationErrors(prev => { const u = { ...prev }; delete u[`momentum-${legIndex}`]; return u; });

                const updatedLeg = { ...leg, momentum_enabled: e.target.checked };

                if (!e.target.checked) {
                  if (updatedLeg.reentry_tgt_mode === 're_momentum' || updatedLeg.reentry_tgt_mode === 're_momentum_reverse') {
                    updatedLeg.reentry_tgt_mode = 're_cost';
                  }
                  if (updatedLeg.reentry_sl_mode === 're_momentum' || updatedLeg.reentry_sl_mode === 're_momentum_reverse') {
                    updatedLeg.reentry_sl_mode = 're_cost';
                  }
                }

                updateLegInPlace(legIndex, updatedLeg);
              }}
              id={`momentum-${legIndex}`}
            />
          </div>
          {legValidationErrors[`momentum-${legIndex}`] && (
            <div className="absolute left-6 top-8 bg-red-50 border border-red-300 text-red-600 text-xs px-3 py-2 rounded shadow-lg z-10 animate-fade-in">
              {legValidationErrors[`momentum-${legIndex}`]}
            </div>
          )}
          <div className="flex gap-2" style={leg.isLazyLeg ? { paddingBottom: '20px' } : {}}>
            <select value={leg.momentum_mode || 'percentage_down'} onChange={(e) => updateLegInPlace(legIndex, { momentum_mode: e.target.value })} disabled={!leg.momentum_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
              <option value="points">Points ↑</option>
              <option value="points_down">Points ↓</option>
              <option value="percentage">Percent ↑</option>
              <option value="percentage_down">Percent ↓</option>
              <option value="underlying_points_up">Underlying Points ↑</option>
              <option value="underlying_points_down">Underlying Points ↓</option>
              <option value="underlying_percentage_up">Underlying Percent ↑</option>
              <option value="underlying_percentage_down">Underlying Percent ↓</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={leg.momentum_value || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== '' && Number(val) < 0) {
                  setResponsePopup({ type: 'error', title: 'Momentum value cannot be negative' });
                  return;
                }
                updateLegInPlace(legIndex, { momentum_value: val });
              }}
              disabled={!leg.momentum_enabled}
              className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              placeholder="0.00"
            />
          </div>
        </div>

        {(strategyType === 'sequential' && !leg.isLazyLeg) && (
          <div className="flex flex-col space-y-2 relative" style={{ paddingLeft: '25px', paddingRight: '25px', paddingBottom: '10px' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Range Break Out</label>
              <Info size={14} className="text-gray-400" />
              <ToggleSwitch
                checked={leg.range_enabled || false}
                onChange={(e) => {
                  if (e.target.checked && leg.momentum_enabled) {
                    setLegValidationErrors(prev => ({ ...prev, [`range-${legIndex}`]: 'Please disable Simple Momentum first.' }));
                    setTimeout(() => {
                      setLegValidationErrors(prev => { const u = { ...prev }; delete u[`range-${legIndex}`]; return u; });
                    }, 3000);
                    return;
                  }
                  setLegValidationErrors(prev => { const u = { ...prev }; delete u[`range-${legIndex}`]; return u; });
                  updateLegInPlace(legIndex, { range_enabled: e.target.checked });
                }}
                id={`rangeBreakout-${legIndex}`}
              />
            </div>
            {legValidationErrors[`range-${legIndex}`] && (
              <div className="absolute left-6 top-8 bg-red-50 border border-red-300 text-red-600 text-xs px-3 py-2 rounded shadow-lg z-10 animate-fade-in">
                {legValidationErrors[`range-${legIndex}`]}
              </div>
            )}
            <div className="flex gap-2">
              <select value={leg.range_instrument || 'underlying'} onChange={(e) => updateLegInPlace(legIndex, { range_instrument: e.target.value })} disabled={!leg.range_enabled} className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 min-w-[140px]">
                <option value="instrument">Instrument</option>
                <option value="underlying">Underlying</option>
              </select>
              <input type="text" value={leg.range_time || '14:45'} onChange={(e) => updateLegInPlace(legIndex, { range_time: e.target.value })} disabled={!leg.range_enabled} placeholder="14:45" className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 w-32" />
              <div className="flex gap-2">
                <button onClick={() => { if (leg.range_enabled) { updateLegInPlace(legIndex, { range_direction: 'high' }); } }} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'high' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'high' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>High</button>
                <button onClick={() => { if (leg.range_enabled) { updateLegInPlace(legIndex, { range_direction: 'low' }); } }} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'low' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'low' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>Low</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 5: Range Break Out - Single Line (non-lazy, non-sequential) */}
      {!leg.isLazyLeg && strategyType !== 'sequential' && (
        <div className="flex flex-col relative" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mt-6">
            <label className="text-sm font-semibold text-gray-700 min-w-fit">Range Break Out</label>
            <Info size={14} className="text-gray-400" />
            <ToggleSwitch
              checked={leg.range_enabled || false}
              onChange={(e) => {
                if (e.target.checked && leg.momentum_enabled) {
                  setLegValidationErrors(prev => ({ ...prev, [`range-${legIndex}`]: 'Please disable Simple Momentum first.' }));
                  setTimeout(() => {
                    setLegValidationErrors(prev => { const u = { ...prev }; delete u[`range-${legIndex}`]; return u; });
                  }, 3000);
                  return;
                }
                setLegValidationErrors(prev => { const u = { ...prev }; delete u[`range-${legIndex}`]; return u; });
                updateLegInPlace(legIndex, { range_enabled: e.target.checked });
              }}
              id={`rangeBreakout-${legIndex}`}
            />
            <select value={leg.range_instrument || 'underlying'} onChange={(e) => updateLegInPlace(legIndex, { range_instrument: e.target.value })} disabled={!leg.range_enabled} className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 min-w-[140px]">
              <option value="instrument">Instrument</option>
              <option value="underlying">Underlying</option>
            </select>
            <input type="text" value={leg.range_time || '14:45'} onChange={(e) => updateLegInPlace(legIndex, { range_time: e.target.value })} disabled={!leg.range_enabled} placeholder="14:45" className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 w-32" />
            <div className="flex gap-2">
              <button onClick={() => { if (leg.range_enabled) { updateLegInPlace(legIndex, { range_direction: 'high' }); } }} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'high' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'high' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>High</button>
              <button onClick={() => { if (leg.range_enabled) { updateLegInPlace(legIndex, { range_direction: 'low' }); } }} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'low' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'low' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>Low</button>
            </div>
          </div>
          {legValidationErrors[`range-${legIndex}`] && (
            <div className="absolute left-6 top-16 bg-red-50 border border-red-300 text-red-600 text-xs px-3 py-2 rounded shadow-lg z-10 animate-fade-in">
              {legValidationErrors[`range-${legIndex}`]}
            </div>
          )}
        </div>
      )}

      {strategyType === 'sequential' && !leg.isLazyLeg && !leg.isSequentialLeg && (
        <div className="flex flex-col justify-end" style={{ paddingLeft: '25px', paddingRight: '25px', paddingBottom: '10px' }}>
          <button
            onClick={() => {
              const existingSeqLeg = allLegs.find(l => l.isSequentialLeg && l.parentLegIndex === legIndex);
              if (existingSeqLeg) {
                setResponsePopup({ type: 'error', title: `SEQ#${legIndex + 1} already created` });
                return;
              }
              setSequentialLegParentIndex(legIndex);
              setShowSequentialLegModal(true);
            }}
            className="px-5 py-2.5 text-white rounded-lg text-base font-semibold hover:shadow-lg active:scale-95 transition-transform duration-75 self-end"
            style={{ backgroundColor: '#4682b4' }}
          >
            Add Sequential Leg
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(LegCard);