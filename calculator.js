const AKCalculator = {
    run: (data) => {
        const players = Math.max(1, data.players);
        const houseRate = data.housePercent / 100;
        
        let winnerCount = (data.winnerMode === 2) 
            ? Math.round(players * (data.rawWinnerVal / 100))
            : Math.floor(data.rawWinnerVal);
        
        winnerCount = Math.max(1, Math.min(winnerCount, players));

        let tierCount = Math.max(1, data.tiers);
        tierCount = Math.min(tierCount, winnerCount);

        const peopleWeights = AKCalculator.getWeights(data.peopleMode, tierCount, false);
        const peoplePerTier = AKCalculator.distributeIntegers(winnerCount, peopleWeights);

        const grossPot = players * data.cost;
        const houseFee = Math.floor(grossPot * houseRate);
        const netPot = grossPot - houseFee;

        const blockSize = data.roundTo5 ? 5 : 1;
        const totalBlocks = Math.floor(netPot / blockSize);

        const tierWeights = AKCalculator.getWeights(data.prizeMode, tierCount, true);
        
        const combinedWeights = tierWeights.map((w, i) => w * peoplePerTier[i]);
        
        const blocksPerTier = AKCalculator.distributeIntegers(totalBlocks, combinedWeights);

        const payoutsPerPerson = blocksPerTier.map((blocks, i) => {
            if (peoplePerTier[i] === 0) return 0;
            const totalGoldForTier = blocks * blockSize;
            return Math.floor(totalGoldForTier / peoplePerTier[i] / blockSize) * blockSize;
        });

        const totalPaid = payoutsPerPerson.reduce((sum, pay, i) => sum + (pay * peoplePerTier[i]), 0);
        const leftover = netPot - totalPaid;

        return {
            grossPot,
            houseFee,
            netPot,
            tiers: tierCount,
            peoplePerTier,
            payouts: payoutsPerPerson,
            totalPaid,
            leftover,
            totalHouse: houseFee + leftover
        };
    },

    getWeights: (mode, count, reverse) => {
        let weights = [];
        if (mode === 'equal') {
            weights = new Array(count).fill(1);
        } else if (mode === 'linear') {
            for (let i = 1; i <= count; i++) weights.push(i);
        } else {
            for (let i = 0; i < count; i++) weights.push(Math.pow(2, i));
        }
        return reverse ? weights.reverse() : weights;
    },

    distributeIntegers: (total, weights) => {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        if (totalWeight === 0) return new Array(weights.length).fill(0);

        const rawShares = weights.map(w => total * (w / totalWeight));
        
        const finalShares = rawShares.map(s => Math.floor(s));
        
        let currentSum = finalShares.reduce((a, b) => a + b, 0);
        let remainder = total - currentSum;

        const details = rawShares.map((s, i) => ({ index: i, decimal: s - Math.floor(s) }));
        details.sort((a, b) => b.decimal - a.decimal);

        for (let i = 0; i < remainder; i++) {
            finalShares[details[i].index]++;
        }

        return finalShares;
    }
};