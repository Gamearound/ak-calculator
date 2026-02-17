const fmt = (num) => num.toLocaleString();

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
        roundTo5: document.getElementById('round5').checked,
    };
}

function isValid(inputs) {
    if (isNaN(inputs.players) || isNaN(inputs.cost) || isNaN(inputs.housePercent) || isNaN(inputs.rawWinnerVal)) {
        document.getElementById('error-area').innerHTML = `<div class="error-msg">Please check your number inputs.</div>`;
        return false;
    }
    return true;
}

function buildHTML(data) {
    let tiersHtml = '';
    
    for (let i = 0; i < data.tiers; i++) {
        if (data.payouts[i] === 0 || data.peoplePerTier[i] === 0) continue;

        const tierTotal = data.payouts[i] * data.peoplePerTier[i];

        tiersHtml += `
            <div class="tier-row">
                <div>
                    <div class="tier-label">Tier ${i + 1}</div>
                    <div class="tier-detail">${data.peoplePerTier[i]} people</div>
                </div>
                <div style="text-align:right">
                    <div class="tier-label" style="color:#007bff">${fmt(data.payouts[i])} G</div>
                    <div class="tier-detail">Total: ${fmt(tierTotal)} G</div>
                </div>
            </div>`;
    }

    return `
        <div class="result-header">
            <div class="result-row"><span>Gross Pot:</span><span>${fmt(data.grossPot)}</span></div>
            <div class="result-row"><span>Initial House Fee:</span><span style="color:#d9534f">-${fmt(data.houseFee)}</span></div>
            <div class="result-row main"><span>Net Prize Pool:</span><span>${fmt(data.netPot)}</span></div>
        </div>
        <div class="result-body">${tiersHtml}</div>
        <div class="result-footer">
            <div class="result-row"><span>Distributed to Players:</span><strong>${fmt(data.totalPaid)}</strong></div>
            <div class="result-row"><span>Rounding Leftovers:</span><span>+${fmt(data.leftover)}</span></div>
            <div class="result-row main"><span>Total House Take:</span><span>${fmt(data.totalHouse)}</span></div>
            <div class="reconciliation">Check: Distributed (${fmt(data.totalPaid)}) + House (${fmt(data.totalHouse)}) = ${fmt(data.totalPaid + data.totalHouse)}</div>
        </div>
    `;
}

function calculatePayout() {
    const errorArea = document.getElementById('error-area');
    const resultArea = document.getElementById('result-area');
    
    errorArea.innerHTML = '';
    resultArea.innerHTML = '';
    resultArea.classList.remove('active');

    const inputs = getInputs();

    if (!isValid(inputs)) return;

    const results = AKCalculator.run(inputs);

    resultArea.innerHTML = buildHTML(results);
    resultArea.classList.add('active');
}