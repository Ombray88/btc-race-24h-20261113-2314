/**
 * CBBTC Trading Bot for make.fun competition.
 * 
 * Strategy Overview:
 * This automated trading system monitors the CBBTC market for localized oversold dips followed by confirmed upward reversals. 
 * Specifically, it remains patient during strong downtrends until price action demonstrates a meaningful pullback relative to historical averages. 
 * The entry logic evaluates three distinct criteria: a medium-term price contraction verifying a dip has occurred, a measurable rebound off the recent swing low, and a short-term momentum stabilization check ensuring the recovery is sustained. 
 * Once invested, the exit mechanism manages risk and profit realization through three pathways: locking in gains upon reaching a positive return threshold, cutting losses if price degrades past a maximum drawdown limit, or releasing capital when a maximum holding duration expires without hitting either boundary.
 */

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, OrderInput } from './vendor/makefun-bars.ts';

// Specifies the target cryptocurrency asset ticker monitored by the strategy.
const SYMBOL = 'CBBTC';
// Defines the historical bar count used as a baseline reference for medium-term price comparisons.
const LOOKBACK_BARS = 30;
// Sets the required downward percentage drop to filter out shallow dips before entry consideration.
const ENTRY_DROP_BPS = -50n;
// Sets the required recovery rebound from swing lows to confirm a bullish price reversal.
const ENTRY_BOUNCE_BPS = 30n;
// Establishes the profit gain threshold required to trigger a successful position exit.
const EXIT_TARGET_BPS = 150n;
// Establishes the maximum allowable loss threshold to trigger a stop-loss trade exit.
const EXIT_STOP_BPS = -40n;
// Limits the maximum number of bars a position can be held before forced liquidation to free capital.
const MAX_HOLD_BARS = 240;
// Restricts maximum allowable price movement tolerance during order placement and execution.
const MAX_SLIPPAGE_BPS = 200;

const closes: bigint[] = [];
let entryPrice: bigint | null = null;
let entrySeq: number | null = null;
let lastProcessedSeq = -1;

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    // 1. Process fills
    for (const fill of batch.fills) {
      if (fill.symbol === SYMBOL && fill.status === 'filled') {
        if (fill.side === 'buy') {
          entryPrice = BigInt(fill.price);
          entrySeq = batch.seq;
        } else if (fill.side === 'sell') {
          entryPrice = null;
          entrySeq = null;
        }
      }
    }

    // 2. Record close price for this batch once
    if (batch.seq !== lastProcessedSeq) {
      lastProcessedSeq = batch.seq;
      const bar = batch.bars.find((b) => b.symbol === SYMBOL);
      const c = bar ? BigInt(bar.c) : state.close(SYMBOL);
      if (c !== null) {
        closes.push(c);
      }
    }

    const currentClose = state.close(SYMBOL);
    if (currentClose === null) {
      return [];
    }

    const pos = state.positions.get(SYMBOL);
    const heldQty = pos ? pos.qty : 0n;

    // 3. Exit logic (if position held and entry price known)
    if (heldQty > 0n && entryPrice !== null && entryPrice > 0n) {
      const gainBps = (currentClose * 10000n) / entryPrice - 10000n;
      const holdBatches = batch.seq - (entrySeq ?? batch.seq);

      // Cap the holding duration to free up capital and exit stagnant trades even if profit targets or stop-loss thresholds remain untouched.
      if (gainBps >= EXIT_TARGET_BPS || gainBps <= EXIT_STOP_BPS || holdBatches >= MAX_HOLD_BARS) {
        return [{
          side: 'sell',
          symbol: SYMBOL,
          qty: heldQty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        }];
      }
      return [];
    }

    // 4. Entry logic (if flat)
    if (heldQty === 0n && closes.length > LOOKBACK_BARS) {
      // Require a bounce from the recent low and short-term stabilization before entering a declining market to prevent catching a falling knife and ensure downward momentum has reversed.
      // Condition 1: Return vs 30 bars earlier <= -50 bps
      const close30Ago = closes[closes.length - 1 - LOOKBACK_BARS];
      const ret30 = (currentClose * 10000n) / close30Ago - 10000n;
      const cond1 = ret30 <= ENTRY_DROP_BPS;

      // Condition 2: Return vs lowest close among last 31 closes >= 30 bps
      const last31 = closes.slice(-31);
      let lowestClose = last31[0];
      for (const c of last31) {
        if (c < lowestClose) lowestClose = c;
      }
      const retLowest = (currentClose * 10000n) / lowestClose - 10000n;
      const cond2 = retLowest >= ENTRY_BOUNCE_BPS;

      // Condition 3: Stabilization check vs 15 bars earlier (skip if < 16 closes)
      let cond3 = true;
      if (closes.length >= 16) {
        const close15Ago = closes[closes.length - 1 - 15];
        cond3 = currentClose >= close15Ago;
      }

      if (cond1 && cond2 && cond3 && state.cash > 0n) {
        return [{
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        }];
      }
    }

    return [];
  },
});
