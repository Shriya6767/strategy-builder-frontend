// Derives every number the Backtest Results screen needs directly from the
// raw backend response shape:
//
//   {
//     success, message,
//     data: [
//       {
//         trade_date: "2022-06-01",
//         entry_datetime: "...",
//         legs: [ { leg, position, option, ticker, strike, moneyness,
//                   distance_from_underlying, entry_datetime, entry_price,
//                   underlying_entry_price, status, target_price,
//                   stoploss_price, exit_datetime, exit_price, exit_reason,
//                   pnl, is_reentry, reentry_mode }, ... ],
//         overall_exits: [ { cycle, exit_datetime, exit_reason, combined_pnl } ]
//       }, ...
//     ]
//   }
//
// The backend does NOT send summary / monthly_stats / cumulative_data /
// drawdown_data — those are all computed here from the leg-level P/L.

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Flatten data[].legs[] into one array, tagging each leg with its trade_date. */
export function flattenTrades(apiData) {
  const trades = [];
  (apiData || []).forEach((record, recordIndex) => {
    (record.legs || []).forEach((leg) => {
      trades.push({ ...leg, trade_date: record.trade_date, record_index: recordIndex });
    });
  });
  // Chronological order (handles reentries firing later the same day correctly).
  trades.sort((a, b) => new Date(a.entry_datetime) - new Date(b.entry_datetime));
  return trades;
}

/** Flatten data[].overall_exits[] into one array, tagging each with its trade_date. */
export function flattenOverallExits(apiData) {
  return (apiData || []).flatMap((record) =>
    (record.overall_exits || []).map((exit) => ({ ...exit, trade_date: record.trade_date }))
  );
}

/** Longest run of consecutive winning / losing trades, in chronological order. */
function computeStreaks(tradesChrono) {
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  tradesChrono.forEach((t) => {
    if ((t.pnl || 0) >= 0) {
      curWin += 1; curLoss = 0;
      maxWin = Math.max(maxWin, curWin);
    } else {
      curLoss += 1; curWin = 0;
      maxLoss = Math.max(maxLoss, curLoss);
    }
  });
  return { maxWin, maxLoss };
}

/**
 * Builds the day-level equity curve (cumulative P/L + running drawdown),
 * grouping trades by trade_date so multiple legs/reentries on the same day
 * net into a single day-level P/L point on the chart.
 */
function buildEquityCurve(apiData) {
  const dayRows = (apiData || [])
    .map((record) => {
      const legs = record.legs || [];
      const dayPnl = legs.reduce((s, l) => s + (l.pnl || 0), 0);
      // Underlying reference point for the day: the first leg's entry underlying price.
      const underlying = legs.length ? legs[0].underlying_entry_price ?? null : null;
      return { date: record.trade_date, pnl: dayPnl, underlying };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let cumulative = 0;
  let peak = 0;
  let peakDate = dayRows[0]?.date ?? null;
  const cumulativeData = [];
  const drawdownData = [];

  dayRows.forEach((row) => {
    cumulative = round2(cumulative + row.pnl);
    cumulativeData.push({ date: row.date, cumulativePnl: cumulative, underlyingValue: row.underlying });

    if (cumulative > peak) {
      peak = cumulative;
      peakDate = row.date;
    }
    const drawdown = round2(cumulative - peak);
    drawdownData.push({ date: row.date, drawdown, peakDate });
  });

  return { dayRows, cumulativeData, drawdownData };
}

/**
 * Groups the day-level equity curve into
 * Year -> { months, total, max_drawdown, mdd_start, mdd_end, days_for_mdd }.
 */
function buildMonthlyStats(dayRows, drawdownData) {
  const monthAbbr = (d) => d.toLocaleDateString('en-US', { month: 'short' });
  const byYear = {};

  dayRows.forEach((row) => {
    const dt = new Date(row.date);
    const year = dt.getFullYear();
    if (!byYear[year]) {
      byYear[year] = {
        months: {}, total: 0,
        max_drawdown: 0, mdd_start: null, mdd_end: null, days_for_mdd: null,
      };
    }
    const bucket = byYear[year];
    const m = monthAbbr(dt);
    bucket.months[m] = round2((bucket.months[m] || 0) + row.pnl);
    bucket.total = round2(bucket.total + row.pnl);
  });

  // Attribute the globally-computed drawdown series to the year each trough falls in,
  // keeping the worst (most negative) drawdown seen in that year and the peak date it
  // fell from — mirrors "Max Drawdown" / "Days for MDD" columns.
  drawdownData.forEach((d) => {
    const year = new Date(d.date).getFullYear();
    const bucket = byYear[year];
    if (!bucket) return;
    if (d.drawdown < bucket.max_drawdown) {
      bucket.max_drawdown = d.drawdown;
      bucket.mdd_end = d.date;
      bucket.mdd_start = d.peakDate;
    }
  });

  Object.values(byYear).forEach((bucket) => {
    if (bucket.mdd_start && bucket.mdd_end) {
      bucket.days_for_mdd =
        Math.round((new Date(bucket.mdd_end) - new Date(bucket.mdd_start)) / 86400000) + 1;
    }
  });

  return byYear;
}

/**
 * Main entry point: given the raw `data` array from the backend response,
 * returns everything BacktestResults.jsx renders.
 */
export function buildDerivedAnalytics(apiData) {
  const allTrades = flattenTrades(apiData);
  const overallExits = flattenOverallExits(apiData);
  const { dayRows, cumulativeData, drawdownData } = buildEquityCurve(apiData);
  const monthlyStats = buildMonthlyStats(dayRows, drawdownData);

  const profitTrades = allTrades.filter((t) => (t.pnl || 0) >= 0);
  const lossTrades   = allTrades.filter((t) => (t.pnl || 0) < 0);
  const totalPnl     = round2(allTrades.reduce((s, t) => s + (t.pnl || 0), 0));
  const totalLoss    = Math.abs(round2(lossTrades.reduce((s, t) => s + (t.pnl || 0), 0)));
  const avgProfit    = profitTrades.length
    ? round2(profitTrades.reduce((s, t) => s + t.pnl, 0) / profitTrades.length)
    : 0;
  const avgLoss = lossTrades.length ? round2(totalLoss / lossTrades.length) : 0;

  const overallMaxDrawdown = drawdownData.length
    ? Math.min(...drawdownData.map((d) => d.drawdown))
    : 0;
  const overallMddPoint = drawdownData.find((d) => d.drawdown === overallMaxDrawdown);
  const daysInMaxDrawdown = overallMddPoint
    ? Math.round(
        (new Date(overallMddPoint.date) - new Date(overallMddPoint.peakDate)) / 86400000
      ) + 1
    : 0;
  const noOfTradesInMaxDd = overallMddPoint
    ? allTrades.filter(
        (t) =>
          t.trade_date >= overallMddPoint.peakDate &&
          t.trade_date <= overallMddPoint.date
      ).length
    : 0;

  const { maxWin, maxLoss } = computeStreaks(allTrades);

  const summary = {
    overall_profit:          totalPnl,
    no_of_trades:            allTrades.length,
    avg_profit_per_trade:    allTrades.length ? round2(totalPnl / allTrades.length) : 0,
    win_percentage:          allTrades.length
      ? Number(((profitTrades.length / allTrades.length) * 100).toFixed(2))
      : 0,
    loss_percentage:         allTrades.length
      ? Number(((lossTrades.length / allTrades.length) * 100).toFixed(2))
      : 0,
    avg_loss_losing_trades:  avgLoss,
    max_profit_single_trade: profitTrades.length ? Math.max(...profitTrades.map((t) => t.pnl)) : 0,
    max_loss_single_trade:   lossTrades.length   ? Math.min(...lossTrades.map((t) => t.pnl))   : 0,
    max_drawdown_trade:      overallMaxDrawdown,
    days_in_max_drawdown:    daysInMaxDrawdown,
    return_to_maxdd:         overallMaxDrawdown !== 0
      ? Number((totalPnl / Math.abs(overallMaxDrawdown)).toFixed(2))
      : 0,
    reward_to_risk:          avgLoss !== 0 ? Number((avgProfit / avgLoss).toFixed(2)) : 0,
    expectancy_ratio:        avgLoss !== 0
      ? Number(
          (
            ((profitTrades.length / (allTrades.length || 1)) * avgProfit -
              (lossTrades.length / (allTrades.length || 1)) * avgLoss) /
            avgLoss
          ).toFixed(2)
        )
      : 0,
    max_win_streak:          maxWin,
    max_loss_streak:         maxLoss,
    no_of_trades_in_max_dd:  noOfTradesInMaxDd,
  };

  return { allTrades, overallExits, monthlyStats, cumulativeData, drawdownData, summary };
}
