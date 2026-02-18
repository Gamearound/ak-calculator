document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calcBtn').addEventListener('click', calculatePayout);
});

const fmt = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

function getInputs() {
    const winnerModeInput = document.querySelector('input[name="winnerMode"]:checked');

    const getVal = (id, def) => {
        const val = document.getElementById(id).value;
        return val === '' ? def : Number(val);
    };

    return {
        players: getVal('players', 0),
        cost: getVal('cost', 0),
        housePercent: getVal('house', 10), // Default 10%
        winnerMode: winnerModeInput ? parseInt(winnerModeInput.value) : 1,
        rawWinnerVal: getVal('winnersVal', 0),
        tiers: getVal('tiers', 1),
        roundTo5: document.getElementById('round5').checked,
    };
}

function showResult(html) {
    const res = document.getElementById('result-area');
    res.innerHTML = html;
    res.style.display = 'block';
    document.getElementById('error-area').style.display = 'none';
}

function showError(msg) {
    const err = document.getElementById('error-area');
    err.innerHTML = msg;
    err.style.display = 'block';
    document.getElementById('result-area').style.display = 'none';
}

function buildSuccessHTML(data) {
    let tiersHtml = '';

    data.payouts.forEach((pay, i) => {
        const count = data.headcount[i];
        const totalForTier = pay * count;

        tiersHtml += `
            <div class="tier-item">
                <div class="tier-left">
                    <div class="t-lbl">Tier ${i + 1}</div>
                    <div class="t-sub">${count} Player${count > 1 ? 's' : ''}</div>
                </div>
                <div class="tier-right">
                    <div class="t-val">${fmt(pay)} <small>Gold</small></div>
                    <div class="t-tot">Total: ${fmt(totalForTier)}</div>
                </div>
            </div>`;
    });

    return `
        <div class="result-header">
            <div class="row"><span>Gross Pot:</span><span>${fmt(data.grossPot)}</span></div>
            <div class="row"><span>House Fee:</span><span style="color:#d63031">-${fmt(data.houseFee)}</span></div>
            <div class="row bold"><span>Net Prize Pool:</span><span>${fmt(data.netPot)}</span></div>
        </div>
        
        <div class="result-body">
            ${tiersHtml}
        </div>
        
        <div class="result-footer">
            <div class="row"><span>Distributed to Winners:</span><strong>${fmt(data.totalDistributed)}</strong></div>
            <div class="row"><span>Rounding Remainder:</span><span>+${fmt(data.leftover)}</span></div>
            <div class="row bold highlight"><span>Total House Keep:</span><span>${fmt(data.totalHouse)}</span></div>
        </div>
    `;
}

function calculatePayout() {
    const inputs = getInputs();

    // 1. Validation
    if (inputs.players <= 0) return showError("Number of Players must be positive.");
    if (inputs.cost < 0) return showError("Entry fee cannot be negative.");
    if (inputs.tiers < 1) return showError("Must have at least 1 Tier.");
    if (inputs.rawWinnerVal <= 0) return showError("Must have at least 1 Winner.");

    // 2. Pre-check Winners vs Tiers
    let estimatedWinners = (inputs.winnerMode === 2)
        ? Math.round(inputs.players * (inputs.rawWinnerVal / 100))
        : Math.floor(inputs.rawWinnerVal);

    if (estimatedWinners < inputs.tiers) {
        return showError(`<strong>Configuration Error:</strong><br>You defined ${inputs.tiers} Tiers but only ${estimatedWinners} Winner(s).<br>Decrease Tiers or increase Winners.`);
    }

    // 3. Run Calculation
    const result = AKCalculator.calculate(inputs);

    if (result.success) {
        showResult(buildSuccessHTML(result.data));
    } else {
        showError(result.error);
    }
}