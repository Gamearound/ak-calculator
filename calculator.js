const AKCalculator = {
    /**
     * Main calculation function.
     * @param {Object} inputs - *Cleaned* inputs from UI
     */
    calculate: (inputs) => {
        const players = Math.max(1, inputs.players);
        const tiers = Math.max(1, inputs.tiers);

        let winners;
        if (inputs.winnerMode === 2) { // Percentage mode
            winners = Math.round(players * (inputs.rawWinnerVal / 100));
        } else { // Fixed mode
            winners = Math.floor(inputs.rawWinnerVal);
        }
        winners = Math.max(tiers, Math.min(winners, players));

        const grossPot = players * inputs.cost;
        const houseFee = Math.floor(grossPot * (inputs.housePercent / 100));
        const netPot = grossPot - houseFee;
        const roundingSize = inputs.roundTo5 ? 5 : 1;

        // Tier 1 has 1 person. Tiers 2..N split remainder exponentially.
        const peoplePerTier = AKCalculator.distributePeopleToTiers(tiers, winners);

        // Payout per person halves every tier downward (approx).
        const payoutsPerTier = AKCalculator.distributePayoutsToTiers(netPot, peoplePerTier, roundingSize);

        const validCheck = AKCalculator.validatePayouts(payoutsPerTier);
        if (!validCheck.success) {
            return { success: false, error: validCheck.message };
        }

        // We recalculate the total used because payouts were rounded down to blocks
        let totalDistributed = 0;
        payoutsPerTier.forEach((pay, index) => {
            totalDistributed += pay * peoplePerTier[index];
        });

        const leftover = netPot - totalDistributed;

        return {
            success: true,
            data: {
                grossPot,
                houseFee,
                netPot,
                tiers: tiers,
                headcount: peoplePerTier,
                payouts: payoutsPerTier,
                totalDistributed,
                leftover,
                totalHouse: houseFee + leftover, // House keeps fee + rounding dust
                winnerCount: winners // Return actual calculated winners
            }
        };
    },

    distributePeopleToTiers: (numTiers, totalWinners) => {
        if (numTiers === 1) return [totalWinners];

        // Tier 1 is always 1 person
        const counts = new Array(numTiers).fill(0);
        counts[0] = 1;

        const remainingPeople = totalWinners - 1;
        const remainingTiers = numTiers - 1;

        if (remainingPeople > 0) {
            const weights = [];
            for (let i = 0; i < remainingTiers; i++) {
                weights.push(Math.pow(2, i));
            }

            const distribution = AKCalculator.distributeIntegers(remainingPeople, weights);

            for (let i = 0; i < remainingTiers; i++) {
                counts[i+1] = distribution[i];
            }
        }

        return counts;
    },

    distributePayoutsToTiers: (netPot, peoplePerTier, roundingSize) => {
        const tiers = peoplePerTier.length;

        const perPersonWeights = [];
        for (let i = 0; i < tiers; i++) {
            perPersonWeights.push(Math.pow(2, (tiers - 1) - i));
        }

        const tierSliceWeights = perPersonWeights.map((w, i) => w * peoplePerTier[i]);

        const totalBlocks = Math.floor(netPot / roundingSize);

        const blocksPerTier = AKCalculator.distributeIntegers(totalBlocks, tierSliceWeights);

        return blocksPerTier.map((totalBlocksForTier, i) => {
            const playersInTier = peoplePerTier[i];
            if (playersInTier === 0) return 0;

            const blocksPerPerson = Math.floor(totalBlocksForTier / playersInTier);

            return blocksPerPerson * roundingSize;
        });
    },

    distributeIntegers: (total, weights) => {
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        if (totalWeight === 0) return weights.map(() => 0);

        const buckets = weights.map((weight, index) => {
            const exact = (weight / totalWeight) * total;
            return {
                index,
                value: Math.floor(exact),
                fraction: exact % 1
            };
        });

        const currentSum = buckets.reduce((sum, b) => sum + b.value, 0);
        let leftovers = total - currentSum;

        buckets.sort((a, b) => b.fraction - a.fraction);

        for (let i = 0; i < leftovers; i++) {
            buckets[i].value++;
        }

        return buckets
            .sort((a, b) => a.index - b.index)
            .map(b => b.value);
    },

    validatePayouts: (payouts) => {
        for (let i = 0; i < payouts.length - 1; i++) {
            const current = payouts[i];
            const next = payouts[i+1];

            if (current === 0) {
                return { success: false, message: `The pot is too small. <strong>Tier ${i+1}</strong> receives 0 payout.` };
            }

            if (next >= current) {
                return {
                    success: false,
                    message: `Price collision detected.<br><strong>Tier ${i+1}</strong> (${current}) is not strictly greater than <strong>Tier ${i+2}</strong> (${next}).<br>Increase Entry Fee, reduce Tiers, or reduce House Cut.`
                };
            }
        }

        if (payouts[payouts.length - 1] <= 0) {
            return { success: false, message: `The lowest tier (Tier ${payouts.length}) receives 0 payout.` };
        }

        return { success: true };
    }
};