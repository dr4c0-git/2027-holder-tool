// Docs / how-it-works for the 2027 holder tool.

export function Docs() {
  return (
    <div className="prose-invert max-w-3xl mx-auto py-10 px-2 space-y-10 text-white/80">
      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          What is this ?
        </h2>
        <p>
          A free, open-source tool for{" "}
          <strong>2027 token holders</strong> on Ethereum. It tells you, from
          any address, what your projected D17 allocation looks like once the
          allocation events run.
        </p>
        <p>
          Built around the official mechanics published by{" "}
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://x.com/xbt2027"
            target="_blank"
            rel="noreferrer"
          >
            @xbt2027
          </a>
          . <strong>Always cross-check on the official profile</strong> before
          acting on financial decisions.
        </p>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          How the allocation works
        </h2>
        <p>
          The D17 launch reserves <strong>35% of total D17 supply</strong> for
          2027 holders, distributed proportionally to each wallet's share of{" "}
          <strong>circulating supply</strong> (i.e. excluding the dead address).
        </p>
        <pre className="bg-black border border-white/10 rounded-md p-3 text-sm overflow-x-auto">
          {`holder_pool       = 35% × 1,000,000,000 D17 = 350,000,000 D17

your_share        = your_2027_balance / circulating_supply
your_d17_total    = your_share × 350,000,000

your_d17_per_event ≈ your_d17_total / 5  (5 events, even split)`}
        </pre>
        <p>
          A direct quote from @xbt2027 :
        </p>
        <blockquote className="border-l-2 border-glow/40 pl-4 italic text-white/70">
          The 1:1 allocation is proportional to your share of circulating
          supply (excluding dead, burned, or long-locked tokens). The 35% global
          cap of D17 supply is then applied across all 2027 holders.
        </blockquote>
        <p>
          Why circulating ? To avoid handing free D17 to un-claimable wallets
          like the dead address.
        </p>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          How to use this tool
        </h2>

        <h3 className="font-serif italic text-xl text-white mt-4 mb-1">
          Lookup tab
        </h3>
        <p>
          Paste any Ethereum address. The tool reads its current 2027 balance
          on-chain and computes :
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>your share of circulating 2027 supply,</li>
          <li>your projected total D17 allocation across all 5 events,</li>
          <li>your per-event projection.</li>
        </ul>
        <p>
          The address doesn't need to be yours. You can look up any wallet you
          care about.
        </p>

        <h3 className="font-serif italic text-xl text-white mt-6 mb-1">
          Holders tab
        </h3>
        <p>
          The full ranked leaderboard. Search by address, click to copy any
          row, or jump to Etherscan. Refreshes every 2 minutes.
        </p>

        <h3 className="font-serif italic text-xl text-white mt-6 mb-1">
          Simulator
        </h3>
        <p>
          What-if : enter a hypothetical 2027 balance and see what the
          corresponding D17 allocation would look like. Useful before
          adjusting your position.
        </p>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          Important details
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Dead address is excluded.</strong> Currently ~65% of total
            2027 supply sits at <code>0x000…dead</code>. This share is treated
            as out-of-circulation, so real holders aren't diluted by burned
            tokens.
          </li>
          <li>
            <strong>Per-event split is an assumption.</strong> The official
            statement says 35% total ; we assume even distribution across 5
            events until clarified. Total figures are unaffected.
          </li>
          <li>
            <strong>Live data.</strong> The backend re-indexes new transfers
            every 2 minutes via Etherscan. Numbers shift as people accumulate
            or distribute 2027.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          Sources
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <a
              className="underline decoration-dotted hover:text-white"
              href="https://x.com/xbt2027/status/2049515425122128352"
              target="_blank"
              rel="noreferrer"
            >
              The Plan - D17 (April 29, 2026, pinned)
            </a>
          </li>
          <li>
            Direct clarifications from @xbt2027 on circulating-vs-total
            interpretation (May 5, 2026).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          See also
        </h2>
        <p>
          For XBT burners :{" "}
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://d17-burn-calculator.pages.dev"
            target="_blank"
            rel="noreferrer"
          >
            d17-burn-calculator.pages.dev
          </a>{" "}
          — companion tool that estimates D17 allocation when burning XBT.
        </p>
      </section>

      <section>
        <h2 className="font-serif italic text-3xl text-white text-glow mb-3">
          Disclaimer
        </h2>
        <p>
          This is a personal tool built by{" "}
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://x.com/__dr4c0__"
            target="_blank"
            rel="noreferrer"
          >
            @__dr4c0__
          </a>{" "}
          as a contribution to the D17 ecosystem. It is not financial advice.
          Always verify the rules on the official @xbt2027 profile before
          acting.
        </p>
      </section>
    </div>
  );
}
