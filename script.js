function format(num) {
    return num.toLocaleString();
}

function getInputs() {
    const winnerModeInput = document.querySelector('input[name="winnerMode"]:checked');
    return {
        players: parseInt(document.getElementById('players').value),
        cost: parseInt(document.getElementById('cost').value),
        housePercent: parseFloat(document.getElementById('house').value),
        winnerMode: winnerModeInput ? parseInt(winnerModeInput.value) : 1,
        rawWinnerVal: parseFloat(document.getElementById('winnersVal').value),
        tiers: parseInt(document.getElementById('tiers').value),
        peopleMode: document.getElementById('peopleMode').value,
        prizeMode: document.getElementById('prizeMode').value,
        roundDown10: document.getElementById('round10').checked,
    };
}

function validateInputs(inputs) {
    if (isNaN(inputs.players) || isNaN(inputs.cost) || isNaN(inputs.housePercent) || isNaN(inputs.rawWinnerVal)) {
        return "Please ensure all fields have valid numbers.";
    }
    if (inputs.players <= 0 || inputs.cost <= 0) {
        return "Players and Entry Fee must be greater than zero.";
    }
    return null;
}

function calculateWinnerCount(inputs) {
    let totalWinners;
    if (inputs.winnerMode === 2) {
        const calcCount = inputs.players * (inputs.rawWinnerVal / 100);
        totalWinners = Math.max(1, Math.round(calcCount));
    } else {
        totalWinners = Math.floor(inputs.rawWinnerVal);
    }

    if (totalWinners > inputs.players) totalWinners = inputs.players;
    if (totalWinners <= 0) totalWinners = 1;

    let tiers = isNaN(inputs.tiers) || inputs.tiers < 1 ? 1 : inputs.tiers;
    if (tiers > totalWinners) tiers = totalWinners;

    return { totalWinners, tiers };
}

function distributePeople(totalWinners, tiers, peopleMode) {
    let tierCounts = new Array(tiers).fill(0);

    if (peopleMode === 'equal' || tiers === 1) {
        const baseCount = Math.floor(totalWinners / tiers);
        let remainder = totalWinners % tiers;
        tierCounts.fill(baseCount);
        for (let i = 0; i < remainder; i++) tierCounts[tiers - 1 - i]++;
        return tierCounts;
    }

    for (let i = 0; i < tiers; i++) tierCounts[i] = 1;
    let remainingPeople = totalWinners - tiers;

    if (remainingPeople > 0) {
        let weights = [];
        if (peopleMode === 'linear') for (let i = 1; i <= tiers; i++) weights.push(i);
        else for (let i = 0; i < tiers; i++) weights.push(Math.pow(2, i));

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        if (totalWeight > 0) {
            let distributed = 0;
            for (let i = 0; i < tiers - 1; i++) {
                const share = Math.round(remainingPeople * (weights[i] / totalWeight));
                tierCounts[i] += share;
                distributed += share;
            }
            tierCounts[tiers - 1] += (remainingPeople - distributed);
        }
    }
    return tierCounts;
}

function calculatePayouts(netPrizePool, tierCounts, tiers, prizeMode, roundDown10) {
    let prizeWeights = [];
    if (prizeMode === 'linear') for (let i = 0; i < tiers; i++) prizeWeights.push(tiers - i);
    else for (let i = 0; i < tiers; i++) prizeWeights.push(Math.pow(2, tiers - 1 - i));

    let totalShares = 0;
    for(let i = 0; i < tiers; i++) totalShares += tierCounts[i] * prizeWeights[i];
    if (totalShares === 0) totalShares = 1;

    const valuePerShare = netPrizePool / totalShares;

    let payouts = [];
    for (let i = 0; i < tiers; i++) {
        const idealPayout = valuePerShare * prizeWeights[i];
        payouts.push(roundDown10 ? Math.floor(idealPayout / 10) * 10 : Math.floor(idealPayout));
    }
    return payouts;
}

function generateResultsHTML(data) {
    let tiersHtml = '';
    for(let i = 0; i < data.tiers; i++) {
        if (data.tierCounts[i] === 0) continue;
        tiersHtml += `
            <div class="tier-row">
                <div>
                    <div class="tier-label">Tier ${i + 1}</div>
                    <div class="tier-detail">${data.tierCounts[i]} people</div>
                </div>
                <div style="text-align:right">
                    <div class="tier-label" style="color:#007bff">${format(data.payouts[i])} G</div>
                    <div class="tier-detail">Total: ${format(data.payouts[i] * data.tierCounts[i])} G</div>
                </div>
            </div>`;
    }

    return `
            <div class="result-header">
                <div class="result-row"><span>Gross Pot:</span><span>${format(data.grossPot)}</span></div>
                <div class="result-row"><span>Initial House Fee (${data.housePercent}%):</span><span style="color:#d9534f">-${format(data.houseInitialFee)}</span></div>
                <div class="result-row main"><span>Net Prize Pool:</span><span>${format(data.netPrizePool)}</span></div>
            </div>
            <div class="result-body">${tiersHtml}</div>
            <div class="result-footer">
                <div class="result-row"><span>Total Distributed to Players:</span><strong>${format(data.totalPaidOut)}</strong></div>
                <div class="result-row"><span>Rounding Leftovers (to House):</span><span>+${format(data.leftoverGold)}</span></div>
                <div class="result-row main"><span>Total House Take (Fee + Rounding):</span><span>${format(data.totalHouseTake)}</span></div>
                <div class="reconciliation">Check: Distributed (${format(data.totalPaidOut)}) + House (${format(data.totalHouseTake)}) = ${format(data.totalPaidOut + data.totalHouseTake)}</div>
            </div>
        `;
}

function calculatePayout() {
    const errorArea = document.getElementById('error-area');
    const resultArea = document.getElementById('result-area');
    errorArea.innerHTML = '';
    resultArea.classList.remove('active');

    // 1. Get and Validate Inputs
    const inputs = getInputs();
    const validationError = validateInputs(inputs);
    if (validationError) {
        errorArea.innerHTML = `<div class="error-msg">${validationError}</div>`;
        return;
    }

    // 2. Determine Winner and Tier Counts
    const { totalWinners, tiers } = calculateWinnerCount(inputs);

    // 3. Distribute People
    const tierCounts = distributePeople(totalWinners, tiers, inputs.peopleMode);

    // 4. Calculate Financials
    const grossPot = inputs.players * inputs.cost;
    const houseInitialFee = Math.floor(grossPot * (inputs.housePercent / 100));
    const netPrizePool = grossPot - houseInitialFee;

    // 5. Calculate Payouts
    const payouts = calculatePayouts(netPrizePool, tierCounts, tiers, inputs.prizeMode, inputs.roundDown10);

    // 6. Final Tally
    let totalPaidOut = 0;
    for(let i = 0; i < tiers; i++) totalPaidOut += payouts[i] * tierCounts[i];
    const leftoverGold = netPrizePool - totalPaidOut;
    const totalHouseTake = houseInitialFee + leftoverGold;

    // 7. Render Results
    const resultsData = { ...inputs, grossPot, houseInitialFee, netPrizePool, tiers, tierCounts, payouts, totalPaidOut, leftoverGold, totalHouseTake };
    resultArea.innerHTML = generateResultsHTML(resultsData);
    resultArea.classList.add('active');
}