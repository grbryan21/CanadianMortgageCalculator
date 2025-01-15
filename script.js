document.addEventListener("DOMContentLoaded", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ELEMENT REFERENCES
  // ─────────────────────────────────────────────────────────────────────────────

  // Mortgage Size
  const mortgageSizeInput = document.getElementById("mortgageSize");
  const mortgageSizeSlider = document.getElementById("mortgageSizeSlider");

  // Down Payment
  const downPaymentInput = document.getElementById("downPaymentInput");
  const downPaymentSlider = document.getElementById("downPaymentSlider");
  const downPaymentPercentDisplay = document.getElementById("downPaymentPercentDisplay");
  const propertyType = document.getElementById("propertyType");

  // Payment Frequency
  const paymentFrequencySelect = document.getElementById("paymentFrequency");
  const advancedFrequencySelect = document.getElementById("advancedFrequency");

  // Interest Rate
  const interestRateInput = document.getElementById("interestRateInput");
  const interestRateSlider = document.getElementById("interestRateSlider");

  // Amortization
  const amortizationRange = document.getElementById("amortization");
  const amortizationDisplay = document.getElementById("amortizationDisplay");

  // Advanced Options
  const propertyTaxInput = document.getElementById("propertyTax");
  const condoFeesInput = document.getElementById("condoFees");
  const extraPrepaymentInput = document.getElementById("extraPrepayment");
  const loanTypeSelect = document.getElementById("loanType");
  const compoundingFrequencySelect = document.getElementById("compoundingFrequency");

  // Results - Show Mortgage Size & Down Payment in the results card
  const mortgageSizeDisplay = document.getElementById("mortgageSizeDisplay");
  const downPaymentDisplay = document.getElementById("downPaymentDisplay");

  // Results - Main Payment
  const monthlyPaymentDisplay = document.getElementById("monthlyPaymentDisplay");
  const insuranceCostDisplay = document.getElementById("insuranceCostDisplay");

  // Carrying Costs
  const carryingCostSection = document.getElementById("carryingCostSection");
  const propertyTaxMonthlyDisplay = document.getElementById("propertyTaxMonthlyDisplay");
  const condoFeesMonthlyDisplay = document.getElementById("condoFeesMonthlyDisplay");

  // Payment Tab
  const principalPaidDisplay = document.getElementById("principalPaidDisplay");
  const interestPaidDisplay = document.getElementById("interestPaidDisplay");
  const totalPaymentDisplay = document.getElementById("totalPaymentDisplay");
  const balanceEndOfTermDisplay = document.getElementById("balanceEndOfTermDisplay");
  const effectiveAmortizationDisplay = document.getElementById("effectiveAmortizationDisplay");

  // Term Tab
  const termPrincipalPaidDisplay = document.getElementById("termPrincipalPaidDisplay");
  const termInterestPaidDisplay = document.getElementById("termInterestPaidDisplay");
  const termTotalPaymentDisplay = document.getElementById("termTotalPaymentDisplay");
  const termBalanceDisplay = document.getElementById("termBalanceDisplay");
  const termAmortizationDisplay = document.getElementById("termAmortizationDisplay");
  const termYearsDisplay = document.getElementById("termYearsDisplay");

  // Total Tab
  const totalPrincipalPaidDisplay = document.getElementById("totalPrincipalPaidDisplay");
  const totalInterestPaidDisplay = document.getElementById("totalInterestPaidDisplay");
  const totalPaymentOverallDisplay = document.getElementById("totalPaymentOverallDisplay");
  const totalBalanceDisplay = document.getElementById("totalBalanceDisplay");
  const totalAmortizationDisplay = document.getElementById("totalAmortizationDisplay");

  // Progress Bars
  const principalProgress = document.getElementById("principalProgress");
  const interestProgress = document.getElementById("interestProgress");
  const termPrincipalProgress = document.getElementById("termPrincipalProgress");
  const termInterestProgress = document.getElementById("termInterestProgress");
  const totalPrincipalProgress = document.getElementById("totalPrincipalProgress");
  const totalInterestProgress = document.getElementById("totalInterestProgress");

  // Comparison <5% Down
  const uninsurableComparison = document.getElementById("uninsurableComparison");
  const uninsurableUserPayment = document.getElementById("uninsurableUserPayment");
  const uninsurableMinDownPayment = document.getElementById("uninsurableMinDownPayment");

  // Configuration Panel
  const configButton = document.getElementById("configButton");
  const configPanel = document.getElementById("configPanel");
  const closeConfig = document.getElementById("closeConfig");

  // Download + Email
  const downloadReportButton = document.getElementById("downloadReport");
  const emailResultsButton = document.getElementById("emailResults");

  // Rate Type Buttons (If you have them)
  // If not, remove these references
  const fixedRateButton = document.getElementById("fixedRate");
  const variableRateButton = document.getElementById("variableRate");

  // Rate Term (If you have a dropdown for rate term)
  const rateTermSelect = document.getElementById("rateTerm");

  // Scenario B elements
  const scenarioBMortgageAmount = document.getElementById("scenarioBMortgageAmount");
  const scenarioBDownPayment = document.getElementById("scenarioBDownPayment");
  const scenarioBInterestRate = document.getElementById("scenarioBInterestRate");
  const scenarioBAmortization = document.getElementById("scenarioBAmortization");
  const scenarioBPaymentFrequency = document.getElementById("scenarioBPaymentFrequency");
  const calculateScenarioBButton = document.getElementById("calculateScenarioB");
  const scenarioBResult = document.getElementById("scenarioBResult");
  const scenarioBPayment = document.getElementById("scenarioBPayment");
  const scenarioBInterestPaid = document.getElementById("scenarioBInterestPaid");
  const scenarioBInsurance = document.getElementById("scenarioBInsurance");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  // Format currency with commas
  const formatCurrency = (amount) => {
    if (isNaN(amount) || amount === null) return "$0.00";
    return `$${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // For integer display of mortgage size / down payment (no decimals)
  const formatIntegerCurrency = (amount) => {
    if (isNaN(amount) || amount === null) return "$0";
    return `$${parseInt(amount, 10).toLocaleString(undefined)}`;
  };

  // Update progress bar
  const updateProgressBar = (principalRatio, interestRatio, principalBar, interestBar) => {
    if (
      isNaN(principalRatio) ||
      isNaN(interestRatio) ||
      principalRatio < 0 ||
      interestRatio < 0
    ) {
      principalBar.style.width = "50%";
      interestBar.style.width = "50%";
      return;
    }
    principalBar.style.width = (principalRatio * 100).toFixed(2) + "%";
    interestBar.style.width = (interestRatio * 100).toFixed(2) + "%";
  };

  // Payment Frequency
  const getPaymentFrequency = () => {
    // If user selected an advanced frequency
    const advFreq = advancedFrequencySelect.value;
    if (advFreq !== "none") {
      switch (advFreq) {
        case "semiannual": return { freq: 2, label: "semi-annually" };
        case "quarterly": return { freq: 4, label: "quarterly" };
        case "daily": return { freq: 365, label: "daily" };
        default: return { freq: 12, label: "monthly" };
      }
    }
    // Otherwise, standard freq
    switch (paymentFrequencySelect.value) {
      case "monthly": return { freq: 12, label: "monthly" };
      case "biweekly": return { freq: 26, label: "bi-weekly (accelerated)" };
      case "biweekly-standard": return { freq: 26, label: "bi-weekly (standard)" };
      case "weekly-accelerated": return { freq: 52, label: "weekly (accelerated)" };
      case "weekly-standard": return { freq: 52, label: "weekly (standard)" };
      default: return { freq: 12, label: "monthly" };
    }
  };

  // Insurance Premium Table
  const insurancePremiumTable = [
    { maxLTV: 0.80, premium: 0.0 },
    { maxLTV: 0.85, premium: 0.018 },
    { maxLTV: 0.90, premium: 0.024 },
    { maxLTV: 0.95, premium: 0.031 },
  ];

  const getInsuranceRate = (ltv) => {
    for (let i = 0; i < insurancePremiumTable.length; i++) {
      if (ltv <= insurancePremiumTable[i].maxLTV) {
        return insurancePremiumTable[i].premium;
      }
    }
    return null;
  };

  // Download CSV
  const downloadReport = () => {
    const data = [
      ["Mortgage Size", mortgageSizeDisplay.innerText],
      ["Down Payment", downPaymentDisplay.innerText],
      ["Mortgage Payment", monthlyPaymentDisplay.innerText],
      ["Mortgage Insurance Cost", insuranceCostDisplay.innerText],
      ["Principal Paid (Payment Tab)", principalPaidDisplay.innerText],
      ["Interest Paid (Payment Tab)", interestPaidDisplay.innerText],
      ["Total Payment (Payment Tab)", totalPaymentDisplay.innerText],
      ["Balance End of Term (Payment Tab)", balanceEndOfTermDisplay.innerText],
      ["Effective Amortization (Payment Tab)", effectiveAmortizationDisplay.innerText],
      ["Term Principal Paid", termPrincipalPaidDisplay.innerText],
      ["Term Interest Paid", termInterestPaidDisplay.innerText],
      ["Term Total Payment", termTotalPaymentDisplay.innerText],
      ["Term Balance End of Term", termBalanceDisplay.innerText],
      ["Term Effective Amortization", termAmortizationDisplay.innerText],
      ["Total Principal Paid (Overall)", totalPrincipalPaidDisplay.innerText],
      ["Total Interest Paid (Overall)", totalInterestPaidDisplay.innerText],
      ["Total Payment (Overall)", totalPaymentOverallDisplay.innerText],
      ["Total Balance End of Term (Overall)", totalBalanceDisplay.innerText],
      ["Total Effective Amortization (Overall)", totalAmortizationDisplay.innerText],
    ];

    let csv = data.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.style.display = "none";
    link.download = "Mortgage_Report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Email Results (placeholder)
  const emailResults = () => {
    alert("This can be integrated with your CRM/email logic to send results.");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SYNCHRONIZATION (Slider ↔ Input)
  // ─────────────────────────────────────────────────────────────────────────────
  const syncMortgageSizeInput = () => {
    mortgageSizeSlider.value = mortgageSizeInput.value;
  };
  const syncMortgageSizeSlider = () => {
    mortgageSizeInput.value = mortgageSizeSlider.value;
  };

  const syncDownPaymentInput = () => {
    const sizeVal = parseFloat(mortgageSizeInput.value) || 0;
    const dpVal = parseFloat(downPaymentInput.value) || 0;
    if (sizeVal <= 0) {
      downPaymentSlider.value = 0;
      downPaymentPercentDisplay.textContent = "0%";
      return;
    }
    const dpPercent = (dpVal / sizeVal) * 100;
    // clamp
    let usedPercent = dpPercent < 0 ? 0 : dpPercent;
    usedPercent = usedPercent > 100 ? 100 : usedPercent;
    downPaymentSlider.value = usedPercent.toFixed(2);
    downPaymentPercentDisplay.textContent = `${usedPercent.toFixed(0)}%`;
  };
  const syncDownPaymentSlider = () => {
    const sizeVal = parseFloat(mortgageSizeInput.value) || 0;
    const sliderVal = parseFloat(downPaymentSlider.value) || 0;
    const dp = (sliderVal / 100) * sizeVal;
    downPaymentInput.value = dp.toFixed(0);
    downPaymentPercentDisplay.textContent = `${sliderVal}%`;
  };

  const syncInterestRateInput = () => {
    interestRateSlider.value = interestRateInput.value;
  };
  const syncInterestRateSlider = () => {
    interestRateInput.value = interestRateSlider.value;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CORE CALCULATION FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const zeroOutResults = () => {
    monthlyPaymentDisplay.innerText = "$0.00";
    insuranceCostDisplay.innerText = "$0.00";

    // Payment tab
    principalPaidDisplay.innerText = "$0.00";
    interestPaidDisplay.innerText = "$0.00";
    totalPaymentDisplay.innerText = "$0.00";
    balanceEndOfTermDisplay.innerText = "$0.00";
    effectiveAmortizationDisplay.innerText = "N/A";

    // Term tab
    termPrincipalPaidDisplay.innerText = "$0.00";
    termInterestPaidDisplay.innerText = "$0.00";
    termTotalPaymentDisplay.innerText = "$0.00";
    termBalanceDisplay.innerText = "$0.00";
    termAmortizationDisplay.innerText = "N/A";
    termYearsDisplay.innerText = "N/A";

    // Total tab
    totalPrincipalPaidDisplay.innerText = "$0.00";
    totalInterestPaidDisplay.innerText = "$0.00";
    totalPaymentOverallDisplay.innerText = "$0.00";
    totalBalanceDisplay.innerText = "$0.00";
    totalAmortizationDisplay.innerText = "N/A";

    principalProgress.style.width = "50%";
    interestProgress.style.width = "50%";
    termPrincipalProgress.style.width = "50%";
    termInterestProgress.style.width = "50%";
    totalPrincipalProgress.style.width = "50%";
    totalInterestProgress.style.width = "50%";
  };

  const getEffectiveRate = (annualNominal, freq, isFixed) => {
    const usedRate = isFixed ? annualNominal : annualNominal + 0.01;
    const comp = parseInt(compoundingFrequencySelect.value, 10);
    const rPerPeriod = usedRate / comp;
    const eAR = Math.pow(1 + rPerPeriod, comp) - 1;
    return eAR / freq;
  };

  const calculatePayment = (principal, ratePerPayment, totalPayments, loanType) => {
    if (loanType === "interestOnly") {
      return principal * ratePerPayment;
    }
    return (
      (principal * ratePerPayment) /
      (1 - Math.pow(1 + ratePerPayment, -totalPayments))
    );
  };

  const calcNoInsurancePayment = (price, annualRate, freq, years, isFixed, loanType, extraPrepay) => {
    const r = getEffectiveRate(annualRate, freq, isFixed);
    const totalP = freq * years;
    const basePmt = calculatePayment(price, r, totalP, loanType);
    const prepayPerPayment = extraPrepay / (12 / freq);
    return basePmt + prepayPerPayment;
  };

  const calcInsurancePayment = (
    purchasePrice,
    dp,
    insurancePremium,
    annualRate,
    freq,
    years,
    isFixed,
    loanType,
    extraPrepay
  ) => {
    const principal = (purchasePrice - dp) + insurancePremium;
    const r = getEffectiveRate(annualRate, freq, isFixed);
    const totalP = freq * years;
    const basePmt = calculatePayment(principal, r, totalP, loanType);
    const prepayPerPayment = extraPrepay / (12 / freq);
    return basePmt + prepayPerPayment;
  };

  function fillBreakdown({
    principal,
    monthlyPayment,
    freq,
    years,
    rateTerm,
    ratePerPayment,
    loanType,
  }) {
    const totalP = freq * years;
    const totalPaid = monthlyPayment * totalP;
    const totalInterest = totalPaid - principal;

    // Show Mortgage Size & DP with commas
    mortgageSizeDisplay.innerText = formatIntegerCurrency(mortgageSizeInput.value);
    downPaymentDisplay.innerText = formatIntegerCurrency(downPaymentInput.value);

    const termY = rateTerm ? parseInt(rateTerm, 10) : 5;
    const termP = termY * freq;

    // Payment tab
    principalPaidDisplay.innerText = formatCurrency(principal);
    interestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentDisplay.innerText = formatCurrency(totalPaid);

    let balanceAfterTerm = 0;
    let termPrincipalPaid = 0;
    let termInterestPaid = 0;

    if (loanType === "interestOnly") {
      balanceAfterTerm = principal;
      termPrincipalPaid = 0;
      termInterestPaid = monthlyPayment * termP;
    } else {
      balanceAfterTerm =
        principal * Math.pow(1 + ratePerPayment, termP) -
        monthlyPayment * ((Math.pow(1 + ratePerPayment, termP) - 1) / ratePerPayment);
      termPrincipalPaid = principal - balanceAfterTerm;
      termInterestPaid = monthlyPayment * termP - termPrincipalPaid;
    }

    balanceEndOfTermDisplay.innerText = formatCurrency(balanceAfterTerm);
    effectiveAmortizationDisplay.innerText = `${years} years`;

    // Term tab
    termPrincipalPaidDisplay.innerText = formatCurrency(termPrincipalPaid);
    termInterestPaidDisplay.innerText = formatCurrency(termInterestPaid);
    termTotalPaymentDisplay.innerText = formatCurrency(monthlyPayment * termP);
    termBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    termAmortizationDisplay.innerText = `${years} years`;
    termYearsDisplay.innerText = termY;

    // Total tab
    totalPrincipalPaidDisplay.innerText = formatCurrency(principal);
    totalInterestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentOverallDisplay.innerText = formatCurrency(totalPaid);
    totalBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    totalAmortizationDisplay.innerText = `${years} years`;

    // progress bars
    const paySum = principal + totalInterest;
    const payPrincipalRatio = principal / paySum;
    const payInterestRatio = totalInterest / paySum;
    updateProgressBar(payPrincipalRatio, payInterestRatio, principalProgress, interestProgress);

    // Term bars
    const termSum = termPrincipalPaid + termInterestPaid;
    const termPrincipalRatio = termSum > 0 ? termPrincipalPaid / termSum : 0;
    const termInterestRatio = termSum > 0 ? termInterestPaid / termSum : 0;
    updateProgressBar(termPrincipalRatio, termInterestRatio, termPrincipalProgress, termInterestProgress);

    // total bars
    updateProgressBar(payPrincipalRatio, payInterestRatio, totalPrincipalProgress, totalInterestProgress);
  }

  // MAIN
  const calculateMortgage = () => {
    uninsurableComparison.classList.add("d-none");

    const purchasePrice = parseFloat(mortgageSizeInput.value) || 0;
    if (purchasePrice <= 0) {
      zeroOutResults();
      return;
    }

    const dpVal = parseFloat(downPaymentInput.value) || 0;
    const { freq, label: freqLabel } = getPaymentFrequency();
    const userRate = parseFloat(interestRateInput.value) || 0;
    if (userRate <= 0) {
      zeroOutResults();
      return;
    }

    const annualNominalRate = userRate / 100;

    // If you have fixed/variable:
    let isFixedRate = true;
    if (fixedRateButton && variableRateButton) {
      isFixedRate = fixedRateButton.classList.contains("active");
    }

    const years = parseInt(amortizationRange.value, 10) || 25;
    amortizationDisplay.innerText = `${years}`;

    let rateTerm = 5;
    if (rateTermSelect) {
      rateTerm = rateTermSelect.value;
    }

    // Advanced
    const propertyTax = parseFloat(propertyTaxInput.value) || 0;
    const condoFees = parseFloat(condoFeesInput.value) || 0;
    const extraPrepayment = parseFloat(extraPrepaymentInput.value) || 0;
    const chosenLoanType = loanTypeSelect.value;

    // Show/hide carrying costs
    if (propertyTax > 0 || condoFees > 0) {
      carryingCostSection.classList.remove("d-none");
      propertyTaxMonthlyDisplay.innerText = formatCurrency(propertyTax / 12);
      condoFeesMonthlyDisplay.innerText = formatCurrency(condoFees);
    } else {
      carryingCostSection.classList.add("d-none");
    }

    // Insurance checks
    const mortgageLoan = purchasePrice - dpVal;
    const ltv = mortgageLoan / purchasePrice;
    let scenarioInsurable = true;
    let insurancePremium = 0;

    if (dpVal <= 0) scenarioInsurable = false;
    if (dpVal >= 0.2 * purchasePrice) {
      // no insurance needed
    } else {
      if (purchasePrice > 1000000) scenarioInsurable = false;
      else if (dpVal < 0.05 * purchasePrice) scenarioInsurable = false;
      else if (propertyType.value === "rental" && ltv > 0.80) scenarioInsurable = false;
      else {
        const rate = getInsuranceRate(ltv);
        if (rate === null) scenarioInsurable = false;
        else insurancePremium = mortgageLoan * rate;
      }
    }

    // <5% => comparison
    if (dpVal > 0 && dpVal < 0.05 * purchasePrice) {
      const monthlyA = calcNoInsurancePayment(
        purchasePrice,
        annualNominalRate,
        freq,
        years,
        isFixedRate,
        chosenLoanType,
        extraPrepayment
      );
      monthlyPaymentDisplay.innerText = formatCurrency(monthlyA) + ` / ${freqLabel}`;
      insuranceCostDisplay.innerText = "N/A (Below 5%)";

      fillBreakdown({
        principal: purchasePrice,
        monthlyPayment: monthlyA,
        freq,
        years,
        rateTerm,
        ratePerPayment: getEffectiveRate(annualNominalRate, freq, isFixedRate),
        loanType: chosenLoanType,
      });

      // forced 5%
      const forcedDP = 0.05 * purchasePrice;
      const forcedLoan = purchasePrice - forcedDP;
      const forcedLTV = forcedLoan / purchasePrice;
      const forcedRate = getInsuranceRate(forcedLTV);
      if (!forcedRate || purchasePrice > 1000000 || propertyType.value === "rental") {
        uninsurableMinDownPayment.innerText = "N/A (Even 5% is not insurable)";
      } else {
        const forcedPremium = forcedLoan * forcedRate;
        const forcedMonthly = calcInsurancePayment(
          purchasePrice,
          forcedDP,
          forcedPremium,
          annualNominalRate,
          freq,
          years,
          isFixedRate,
          chosenLoanType,
          extraPrepayment
        );
        uninsurableMinDownPayment.innerText = formatCurrency(forcedMonthly) + ` (${freqLabel})`;
      }
      uninsurableComparison.classList.remove("d-none");
      uninsurableUserPayment.innerText = formatCurrency(monthlyA) + ` (${freqLabel})`;
      return;
    }

    // If not insurable
    if (!scenarioInsurable) {
      const monthlyPmt = calcNoInsurancePayment(
        purchasePrice,
        annualNominalRate,
        freq,
        years,
        isFixedRate,
        chosenLoanType,
        extraPrepayment
      );
      monthlyPaymentDisplay.innerText = formatCurrency(monthlyPmt) + ` / ${freqLabel}`;
      insuranceCostDisplay.innerText = "N/A";
      fillBreakdown({
        principal: purchasePrice,
        monthlyPayment: monthlyPmt,
        freq,
        years,
        rateTerm,
        ratePerPayment: getEffectiveRate(annualNominalRate, freq, isFixedRate),
        loanType: chosenLoanType,
      });
      return;
    }

    // Insurable
    insuranceCostDisplay.innerText = formatCurrency(insurancePremium);
    const insuredMonthly = calcInsurancePayment(
      purchasePrice,
      dpVal,
      insurancePremium,
      annualNominalRate,
      freq,
      years,
      isFixedRate,
      chosenLoanType,
      extraPrepayment
    );
    monthlyPaymentDisplay.innerText = formatCurrency(insuredMonthly) + ` / ${freqLabel}`;

    fillBreakdown({
      principal: (purchasePrice - dpVal) + insurancePremium,
      monthlyPayment: insuredMonthly,
      freq,
      years,
      rateTerm,
      ratePerPayment: getEffectiveRate(annualNominalRate, freq, isFixedRate),
      loanType: chosenLoanType,
    });
  };

  // Scenario B
  const calculateScenarioB = () => {
    scenarioBResult.classList.add("d-none");

    const priceB = parseFloat(scenarioBMortgageAmount.value) || 0;
    const dpB = parseFloat(scenarioBDownPayment.value) || 0;
    const rateB = parseFloat(scenarioBInterestRate.value) || 0;
    const yearsB = parseInt(scenarioBAmortization.value, 10) || 25;
    const freqVal = scenarioBPaymentFrequency.value;

    if (priceB <= 0 || rateB <= 0 || dpB < 0) {
      return;
    }

    let scenarioInsurableB = true;
    let insuranceB = 0;
    if (dpB < 0.05 * priceB || priceB > 1000000) {
      scenarioInsurableB = false;
    }
    const ltvB = (priceB - dpB) / priceB;
    const possibleRate = getInsuranceRate(ltvB);
    if (!possibleRate) scenarioInsurableB = false;

    const freqData = (() => {
      switch (freqVal) {
        case "monthly": return { freq: 12, label: "monthly" };
        case "biweekly": return { freq: 26, label: "bi-weekly (accelerated)" };
        case "biweekly-standard": return { freq: 26, label: "bi-weekly (standard)" };
        case "weekly-accelerated": return { freq: 52, label: "weekly (accelerated)" };
        case "weekly-standard": return { freq: 52, label: "weekly (standard)" };
        default: return { freq: 12, label: "monthly" };
      }
    })();

    const annualNomB = rateB / 100;
    const isFixedB = true; // Simplify
    const chosenLoanTypeB = "regular";
    const extraB = 0;

    let monthlyB = 0;
    if (!scenarioInsurableB) {
      // no insurance
      monthlyB = calcNoInsurancePayment(
        priceB,
        annualNomB,
        freqData.freq,
        yearsB,
        isFixedB,
        chosenLoanTypeB,
        extraB
      );
      scenarioBInsurance.innerText = "N/A";
    } else {
      insuranceB = (priceB - dpB) * possibleRate;
      const monthlyI = calcInsurancePayment(
        priceB,
        dpB,
        insuranceB,
        annualNomB,
        freqData.freq,
        yearsB,
        isFixedB,
        chosenLoanTypeB,
        extraB
      );
      monthlyB = monthlyI;
      scenarioBInsurance.innerText = formatCurrency(insuranceB);
    }

    const totalP = freqData.freq * yearsB;
    const totalPaid = monthlyB * totalP;
    const principalB = scenarioInsurableB
      ? (priceB - dpB) + insuranceB
      : priceB;
    const interestOverTerm = totalPaid - principalB;

    scenarioBPayment.innerText = formatCurrency(monthlyB);
    scenarioBInterestPaid.innerText = formatCurrency(interestOverTerm);

    scenarioBResult.classList.remove("d-none");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Mortgage Size
  mortgageSizeInput.addEventListener("input", () => {
    syncMortgageSizeInput();
    syncDownPaymentInput();
    calculateMortgage();
  });
  mortgageSizeSlider.addEventListener("input", () => {
    syncMortgageSizeSlider();
    syncDownPaymentInput();
    calculateMortgage();
  });

  // Down Payment
  downPaymentInput.addEventListener("input", () => {
    syncDownPaymentInput();
    calculateMortgage();
  });
  downPaymentSlider.addEventListener("input", () => {
    syncDownPaymentSlider();
    calculateMortgage();
  });

  // Interest Rate
  interestRateInput.addEventListener("input", () => {
    syncInterestRateInput();
    calculateMortgage();
  });
  interestRateSlider.addEventListener("input", () => {
    syncInterestRateSlider();
    calculateMortgage();
  });

  // Payment Frequency
  paymentFrequencySelect.addEventListener("change", calculateMortgage);
  advancedFrequencySelect.addEventListener("change", calculateMortgage);

  // Amortization
  amortizationRange.addEventListener("input", calculateMortgage);

  // Advanced
  propertyTaxInput.addEventListener("input", calculateMortgage);
  condoFeesInput.addEventListener("input", calculateMortgage);
  extraPrepaymentInput.addEventListener("input", calculateMortgage);
  loanTypeSelect.addEventListener("change", calculateMortgage);
  compoundingFrequencySelect.addEventListener("change", calculateMortgage);

  // If you have fixed/variable buttons
  if (fixedRateButton && variableRateButton) {
    fixedRateButton.addEventListener("click", () => {
      fixedRateButton.classList.add("active");
      variableRateButton.classList.remove("active");
      calculateMortgage();
    });
    variableRateButton.addEventListener("click", () => {
      variableRateButton.classList.add("active");
      fixedRateButton.classList.remove("active");
      calculateMortgage();
    });
  }

  // If you have a rateTermSelect
  if (rateTermSelect) {
    rateTermSelect.addEventListener("change", calculateMortgage);
  }

  // Config Panel Slide-in
  configButton.addEventListener("click", () => {
    configPanel.classList.remove("d-none");
    configPanel.style.transform = "translateX(0)";
  });
  closeConfig.addEventListener("click", () => {
    configPanel.style.transform = "translateX(100%)";
  });

  // Download
  downloadReportButton.addEventListener("click", downloadReport);

  // Email
  emailResultsButton.addEventListener("click", emailResults);

  // Scenario B
  calculateScenarioBButton.addEventListener("click", calculateScenarioB);

  // Initial load
  syncMortgageSizeInput();
  syncDownPaymentInput();
  syncInterestRateInput();
  calculateMortgage();
});
