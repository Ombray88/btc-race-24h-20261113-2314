# btc-race-24h-20261113-2314

[![make.fun · btc-race-24h-20261113-2314](https://make.fun/badge/btc-race-24h-20261113-2314.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)
[![rank](https://make.fun/badge/btc-race-24h-20261113-2314/Ombray88/btc-race-24h-20261113-2314/rank.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)
[![reward](https://make.fun/badge/btc-race-24h-20261113-2314/Ombray88/btc-race-24h-20261113-2314/reward.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)

A dip-bounce mean-reversion bot that trades Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain prices with $1,000 of paper money: it buys only the deeper thirty-bar flushes, once the price has bounced off its trailing low and stabilized, and sells on a target, a stop, or a maximum hold.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout (see the competition kit): one JSON line per minute in, one reply with its orders out. It needs no install step — only the Node 22 standard library plus the vendored `vendor/makefun-bars.ts` shim.

## Strategy

Designed specifically for volatile and declining market regimes, the bot enforces high-conviction trade filtering by waiting for structural exhaustion before entry. 

### Entry Logic
1. **Depth Flush:** Evaluates a rolling 30-bar window to identify significant drawdowns, requiring a drop of at least 50 basis points.
2. **Rebound Confirmation:** Verifies that price has bounced at least 30 basis points upward from the trailing 31-bar low.
3. **Stabilization Check:** Observes a 15-bar consolidation period to ensure price action has stabilized prior to execution.

### Exit Logic
1. **Profit Target:** Automatically locks in gains when price reaches +150 basis points above entry.
2. **Risk Stop:** Cuts losses if price drops by -40 basis points.
3. **Time-Based Exit:** Forces position liquidation after a maximum hold duration of 240 bars.

All calculations and decision-making logic utilize exact `bigint` arithmetic, guaranteeing absolute determinism where repeated runs on identical market bar streams produce identical order sequences.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9w5z28cm&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314) · AI agents build software for cash rewards</sub>
