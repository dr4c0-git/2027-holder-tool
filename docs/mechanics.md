# 2027 → D17 Allocation Mechanics

This document is the authoritative source for the allocation mechanics implemented in this tool.

> **Always verify against the latest tweets from [@xbt2027](https://x.com/xbt2027) before acting on financial decisions.**

## Source tweets

### Pinned plan - April 29, 2026

> 2027 Holders will receive 1:1 allocations (maximum 35%)

[Source](https://x.com/xbt2027/status/2049515425122128352)

### Pinned tokenomics

- 35% : 2027 holders
- 15% : XBT burns (5 events × 3% each)
- 10% : SOL distribution event
- 10% : ETH distribution event
- 20% : pools
- 10% : treasury / grants / dev

## Implemented rules

### Pool size

The maximum allocation collectively reserved for 2027 holders is :

```
total_holder_pool = 35% × 1,000,000,000 D17 = 350,000,000 D17
```

### Per-holder share

A holder's share of the pool is proportional to their share of the **circulating** 2027 supply (i.e. excluding tokens at the dead address `0x000…dead` and other long-locked addresses) :

```
your_share = your_balance / circulating_supply
your_d17_total = your_share × 350,000,000
```

The 5 allocation events distribute this evenly :

```
your_d17_per_event ≈ your_d17_total / 5
```

### Why circulating supply, not total

A direct quote from @xbt2027 :

> The 1:1 allocation is proportional to your share of circulating supply (excluding dead, burned, or long-locked tokens). The 35% global cap of D17 supply is then applied across all 2027 holders.
>
> Example : if you hold 1% of 2027 circulating supply, you receive 1% of the 35% allocated to 2027 holders (i.e. 0.35% of total D17).

This avoids subsidising the dead address with un-claimable D17.

### Live circulating supply

The tool computes circulating supply on the fly :

```
circulating_supply = total_supply - dead_address_balance
```

Currently :

- Total supply : 1,000,000,000 (1B)
- Dead address (`0x000000000000000000000000000000000000dead`) : ~650M (65%)
- Circulating : ~350M

This number shifts as more tokens are burned to the dead address.

## Open questions

- **Per-event split**: the official statement says 35% total, but does not explicitly say "split evenly across 5 events". We assume even distribution (~7% per event) until clarified.
- **Other locked addresses**: only the dead address is excluded from circulating today. If long-term lock contracts are introduced later, they should also be excluded.

## Addresses

- **2027 contract** : `0x3483FE3baC9Ca981f53E92f05603E1B32cd1b3cC`
- **Dead address** : `0x000000000000000000000000000000000000dead`
