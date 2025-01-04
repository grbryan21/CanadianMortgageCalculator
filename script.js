document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const mortgageAmount = document.getElementById("mortgageAmount");
  const customMortgageAmount = document.getElementById("customMortgageAmount");
  const interestRate = document.getElementById("interestRate");
  const customInterestRate = document.getElementById("customInterestRate");
  const amortization = document.getElementById("amortization");
  const paymentFrequency = document.getElementById("paymentFrequency");
  const loanType = document.getElementById("loanType");
  const compoundingFrequency = document.getElementById("compoundingFrequency");
  const fixedRateButton = document.getElementById("fixedRate");
  const variableRateButton = document.getElementById("variableRate");
  const rateTerm = document.getElementById("rateTerm");

  // Insurance
  const downPaymentInput = document.getElementById("downPayment");
  const propertyType = document.getElementById("propertyType");
  const insuranceCostDisplay = document.getElementById("insuranceCostDisplay");

  // Payment tab fields
  const totalPaymentDisplay = document.getElementById("totalPaymentDisplay");
  const balanceEndOfTermDisplay = document.getElementById("balanceEndOfTermDisplay");
  const effectiveAmortizationDisplay = document.getElementById("effectiveAmortizationDisplay");

  // Other display elements
  const mortgageAmountDisplay = document.getElementById("mortgageAmountDisplay");
  const monthlyPaymentDisplay = document.getElementById("monthlyPaymentDisplay");
  const principalPaidDisplay = document.getElementById("principalPaidDisplay");
  const interestPaidDisplay = document.getElementById("interestPaidDisplay");
  const termPrincipalPaidDisplay = document.getElementById("termPrincipalPaidDisplay");
  const termInterestPaidDisplay = document.getElementById("termInterestPaidDisplay");
  const termTotalPaymentDisplay = document.getElementById("termTotalPaymentDisplay");
  const termBalanceDisplay = document.getElementById("termBalanceDisplay");
  const termYearsDisplay = document.getElementById("termYearsDisplay");
  const termAmortizationDisplay = document.getElementById("termAmortizationDisplay");
  const totalPrincipalPaidDisplay = document.getElementById("totalPrincipalPaidDisplay");
  const totalInterestPaidDisplay = document.getElementById("totalInterestPaidDisplay");
  const totalPaymentOverallDisplay = document.getElementById("totalPaymentOverallDisplay");
  const totalBalanceDisplay = document.getElementById("totalBalanceDisplay");
  const totalAmortizationDisplay = document.getElementById("totalAmortizationDisplay");
  const principalProgress = document.getElementById("principalProgress");
  const interestProgress = document.getElementById("interestProgress");
  const termPrincipalProgress = document.getElementById("termPrincipalProgress");
  const termInterestProgress = document.getElementById("termInterestProgress");
  const totalPrincipalProgress = document.getElementById("totalPrincipalProgress");
  const totalInterestProgress = document.getElementById("totalInterestProgress");

  // Comparison elements (for <5% scenario)
  const uninsurableComparison = document.getElementById("uninsurableComparison");
  const uninsurableUserPayment = document.getElementById("uninsurableUserPayment");
  const uninsurableMinDownPayment = document.getElementById("uninsurableMinDownPayment");

  // Config panel
  const configButton = document.getElementById("configButton");
  const configPanel = document.getElementById("configPanel");
  const closeConfig = document.getElementById("closeConfig");

  // Download
  const downloadReportButton = document.getElementById("downloadReport");

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  // Format currency
  const formatCurrency = (amount) => {
    if (isNaN(amount)) return "$0.00";
    return `$${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Progress bar
  const updateProgressBar = (principalRatio, interestRatio, principalBar, interestBar) => {
    if (isNaN(principalRatio) || isNaN(interestRatio) || principalRatio < 0 || interestRatio < 0) {
      principalBar.style.width = "50%";
      interestBar.style.width = "50%";
      return;
    }
    principalBar.style.width = (principalRatio * 100).toFixed(2) + "%";
    interestBar.style.width = (interestRatio * 100).toFixed(2) + "%";
  };

  // Basic premium table
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
    // ltv > 0.95 => not insurable
    return null;
  };

  // Zero out main display
  const zeroOutResults = () => {
    // Payment tab
    totalPaymentDisplay.innerText = "$0.00";
    balanceEndOfTermDisplay.innerText = "$0.00";
    effectiveAmortizationDisplay.innerText = "N/A";
    principalPaidDisplay.innerText = "$0.00";
    interestPaidDisplay.innerText = "$0.00";

    // Term tab
    termPrincipalPaidDisplay.innerText = "$0.00";
    termInterestPaidDisplay.innerText = "$0.00";
    termTotalPaymentDisplay.innerText = "$0.00";
    termBalanceDisplay.innerText = "$0.00";
    termAmortizationDisplay.innerText = "N/A";

    // Total tab
    totalPrincipalPaidDisplay.innerText = "$0.00";
    totalInterestPaidDisplay.innerText = "$0.00";
    totalPaymentOverallDisplay.innerText = "$0.00";
    totalBalanceDisplay.innerText = "$0.00";
    totalAmortizationDisplay.innerText = "N/A";

    // progress bars fallback
    principalProgress.style.width = "50%";
    interestProgress.style.width = "50%";
    termPrincipalProgress.style.width = "50%";
    termInterestProgress.style.width = "50%";
    totalPrincipalProgress.style.width = "50%";
    totalInterestProgress.style.width = "50%";
  };

  // Simple no-insurance calculation
  // returns { payment, freqString }
  const runNoInsuranceCalc = (price, annualRate, theYears) => {
    let freq;
    let freqString;
    switch (paymentFrequency.value) {
      case "monthly": freq = 12; freqString = "monthly"; break;
      case "biweekly": freq = 26; freqString = "biweekly"; break;
      case "weekly": freq = 52; freqString = "weekly"; break;
      case "daily": freq = 365; freqString = "daily"; break;
      case "quarterly": freq = 4; freqString = "quarterly"; break;
      case "semiannual": freq = 2; freqString = "semi-annually"; break;
      default: freq = 12; freqString = "monthly";
    }

    const isFixedRate = fixedRateButton.classList.contains("active");
    const adjustedRate = isFixedRate ? annualRate : annualRate + 0.01;
    const comp = parseInt(compoundingFrequency.value, 10);
    const ratePerPeriod = adjustedRate / comp;
    const eAR = Math.pow(1 + ratePerPeriod, comp) - 1;
    const eRatePerPayment = eAR / freq;
    const totalP = theYears * freq;

    let pmnt = 0;
    if (loanType.value === "interestOnly") {
      pmnt = price * eRatePerPayment;
    } else {
      pmnt =
        (price * eRatePerPayment) /
        (1 - Math.pow(1 + eRatePerPayment, -totalP));
    }

    return { payment: pmnt, freqString };
  };

  // Full insurance-based scenario
  const runInsuranceCalc = (purchase, dp, propType, baseAnnualRate, theYears) => {
    let isInsurable = true;
    let insuranceCost = 0;
    const mortgageLoan = purchase - dp;

    // Basic checks
    if (purchase > 1000000) isInsurable = false;
    if (dp < 0.05 * purchase) isInsurable = false;
    const ltv = mortgageLoan / purchase;
    if (propType === "rental" && ltv > 0.80) isInsurable = false;

    let textInsurance = "$0.00";
    if (dp >= 0.20 * purchase) {
      insuranceCost = 0;
    } else {
      const rate = getInsuranceRate(ltv);
      if (rate === null) isInsurable = false;
      else if (isInsurable) insuranceCost = mortgageLoan * rate;
    }

    if (!isInsurable) textInsurance = "N/A";
    else textInsurance = formatCurrency(insuranceCost);

    // Payment freq
    let freq;
    let freqString;
    switch (paymentFrequency.value) {
      case "monthly": freq = 12; freqString = "monthly"; break;
      case "biweekly": freq = 26; freqString = "biweekly"; break;
      case "weekly": freq = 52; freqString = "weekly"; break;
      case "daily": freq = 365; freqString = "daily"; break;
      case "quarterly": freq = 4; freqString = "quarterly"; break;
      case "semiannual": freq = 2; freqString = "semi-annually"; break;
      default: freq = 12; freqString = "monthly";
    }

    const isFixedRate = fixedRateButton.classList.contains("active");
    const adjRate = isFixedRate ? baseAnnualRate : baseAnnualRate + 0.01;
    const comp = parseInt(compoundingFrequency.value, 10);
    const rPerPeriod = adjRate / comp;
    const eAR = Math.pow(1 + rPerPeriod, comp) - 1;
    const eRatePerPayment = eAR / freq;
    const totalP = theYears * freq;

    let payment = 0;
    if (!isInsurable) {
      // do nothing
    } else if (loanType.value === "interestOnly") {
      payment = (mortgageLoan + insuranceCost) * eRatePerPayment;
    } else {
      payment =
        ((mortgageLoan + insuranceCost) * eRatePerPayment) /
        (1 - Math.pow(1 + eRatePerPayment, -totalP));
    }

    return {
      scenarioWorks: isInsurable,
      insuranceCost: textInsurance,
      payment,
      freqString,
    };
  };

  // Fill out the main details with no-insurance approach
  const fillOutNoInsuranceMainDetails = (
    purchasePrice,
    baseAnnualRate,
    years,
    monthlyPayment
  ) => {
    let freq;
    switch (paymentFrequency.value) {
      case "monthly": freq = 12; break;
      case "biweekly": freq = 26; break;
      case "weekly": freq = 52; break;
      case "daily": freq = 365; break;
      case "quarterly": freq = 4; break;
      case "semiannual": freq = 2; break;
      default: freq = 12;
    }
    const isFixedRate = fixedRateButton.classList.contains("active");
    const adjRate = isFixedRate ? baseAnnualRate : baseAnnualRate + 0.01;
    const comp = parseInt(compoundingFrequency.value, 10);
    const rPerPeriod = adjRate / comp;
    const eAR = Math.pow(1 + rPerPeriod, comp) - 1;
    const eRatePerPayment = eAR / freq;
    const totalP = years * freq;

    let type = loanType.value;
    const totalPayment = monthlyPayment * totalP;
    const totalInterest = totalPayment - purchasePrice;

    let balanceAfterTerm = 0;
    let termPrincipalPaid = 0;
    let termInterestPaid = 0;
    const rateTermYears = parseInt(rateTerm.value, 10);
    const termPayments = rateTermYears * freq;

    if (type === "interestOnly") {
      balanceAfterTerm = purchasePrice;
      termPrincipalPaid = 0;
      termInterestPaid = monthlyPayment * termPayments;
    } else {
      balanceAfterTerm =
        purchasePrice * Math.pow(1 + eRatePerPayment, termPayments) -
        monthlyPayment *
          ((Math.pow(1 + eRatePerPayment, termPayments) - 1) / eRatePerPayment);
      termPrincipalPaid = purchasePrice - balanceAfterTerm;
      termInterestPaid = monthlyPayment * termPayments - termPrincipalPaid;
    }

    // Payment tab
    principalPaidDisplay.innerText = formatCurrency(purchasePrice);
    interestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentDisplay.innerText = formatCurrency(totalPayment);
    balanceEndOfTermDisplay.innerText = formatCurrency(balanceAfterTerm);
    effectiveAmortizationDisplay.innerText = `${years} years`;

    // Term tab
    termPrincipalPaidDisplay.innerText = formatCurrency(termPrincipalPaid);
    termInterestPaidDisplay.innerText = formatCurrency(termInterestPaid);
    termTotalPaymentDisplay.innerText = formatCurrency(monthlyPayment * termPayments);
    termBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    termAmortizationDisplay.innerText = `${years} years`;
    termYearsDisplay.innerText = rateTermYears;

    // Total tab
    totalPrincipalPaidDisplay.innerText = formatCurrency(purchasePrice);
    totalInterestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentOverallDisplay.innerText = formatCurrency(totalPayment);
    totalBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    totalAmortizationDisplay.innerText = `${years} years`;

    // Progress bars
    const paymentTabPrincipalRatio = purchasePrice / (purchasePrice + totalInterest);
    const paymentTabInterestRatio = totalInterest / (purchasePrice + totalInterest);
    updateProgressBar(
      paymentTabPrincipalRatio,
      paymentTabInterestRatio,
      principalProgress,
      interestProgress
    );

    const termSum = termPrincipalPaid + termInterestPaid;
    const termPrincipalRatio = termSum > 0 ? termPrincipalPaid / termSum : 0;
    const termInterestRatio = termSum > 0 ? termInterestPaid / termSum : 0;
    updateProgressBar(
      termPrincipalRatio,
      termInterestRatio,
      termPrincipalProgress,
      termInterestProgress
    );

    const overallSum = purchasePrice + totalInterest;
    const overallPrincipalRatio = overallSum > 0 ? purchasePrice / overallSum : 0;
    const overallInterestRatio = overallSum > 0 ? totalInterest / overallSum : 0;
    updateProgressBar(
      overallPrincipalRatio,
      overallInterestRatio,
      totalPrincipalProgress,
      totalInterestProgress
    );
  };

  // Fill out main details if scenario is fully insurable
  const fillOutMainDetails = (
    purchasePrice,
    downPaymentVal,
    monthlyPayment,
    baseAnnualRate,
    years,
    insuranceCostVal
  ) => {
    // principal = (purchase - dp + insurance)
    const principal = (purchasePrice - downPaymentVal) + parseFloat(insuranceCostVal.replace(/[^0-9.]/g, "")) || 0;
    let freq;
    switch (paymentFrequency.value) {
      case "monthly": freq = 12; break;
      case "biweekly": freq = 26; break;
      case "weekly": freq = 52; break;
      case "daily": freq = 365; break;
      case "quarterly": freq = 4; break;
      case "semiannual": freq = 2; break;
      default: freq = 12;
    }

    const isFixedRate = fixedRateButton.classList.contains("active");
    const adjRate = isFixedRate ? baseAnnualRate : baseAnnualRate + 0.01;
    const comp = parseInt(compoundingFrequency.value, 10);
    const rPerPeriod = adjRate / comp;
    const eAR = Math.pow(1 + rPerPeriod, comp) - 1;
    const eRatePerPayment = eAR / freq;
    const totalP = years * freq;

    const type = loanType.value;
    const totalPayment = monthlyPayment * totalP;
    const totalInterest = totalPayment - principal;

    const rateTermYears = parseInt(rateTerm.value, 10);
    const termPayments = rateTermYears * freq;

    let balanceAfterTerm = 0;
    let termPrincipalPaid = 0;
    let termInterestPaid = 0;

    if (type === "interestOnly") {
      balanceAfterTerm = principal;
      termPrincipalPaid = 0;
      termInterestPaid = monthlyPayment * termPayments;
    } else {
      balanceAfterTerm =
        principal * Math.pow(1 + eRatePerPayment, termPayments) -
        monthlyPayment *
          ((Math.pow(1 + eRatePerPayment, termPayments) - 1) / eRatePerPayment);
      termPrincipalPaid = principal - balanceAfterTerm;
      termInterestPaid = monthlyPayment * termPayments - termPrincipalPaid;
    }

    // Payment tab
    principalPaidDisplay.innerText = formatCurrency(principal);
    interestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentDisplay.innerText = formatCurrency(totalPayment);
    balanceEndOfTermDisplay.innerText = formatCurrency(balanceAfterTerm);
    effectiveAmortizationDisplay.innerText = `${years} years`;

    // Term tab
    termPrincipalPaidDisplay.innerText = formatCurrency(termPrincipalPaid);
    termInterestPaidDisplay.innerText = formatCurrency(termInterestPaid);
    termTotalPaymentDisplay.innerText = formatCurrency(monthlyPayment * termPayments);
    termBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    termAmortizationDisplay.innerText = `${years} years`;
    termYearsDisplay.innerText = rateTermYears;

    // Total tab
    totalPrincipalPaidDisplay.innerText = formatCurrency(principal);
    totalInterestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentOverallDisplay.innerText = formatCurrency(totalPayment);
    totalBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    totalAmortizationDisplay.innerText = `${years} years`;

    // Progress bars
    const paymentTabPrincipalRatio = principal / (principal + totalInterest);
    const paymentTabInterestRatio = totalInterest / (principal + totalInterest);
    updateProgressBar(
      paymentTabPrincipalRatio,
      paymentTabInterestRatio,
      principalProgress,
      interestProgress
    );

    const termSum = termPrincipalPaid + termInterestPaid;
    const termPrincipalRatio = termSum > 0 ? termPrincipalPaid / termSum : 0;
    const termInterestRatio = termSum > 0 ? termInterestPaid / termSum : 0;
    updateProgressBar(
      termPrincipalRatio,
      termInterestRatio,
      termPrincipalProgress,
      termInterestProgress
    );

    const overallSum = principal + totalInterest;
    const overallPrincipalRatio = overallSum > 0 ? principal / overallSum : 0;
    const overallInterestRatio = overallSum > 0 ? totalInterest / overallSum : 0;
    updateProgressBar(
      overallPrincipalRatio,
      overallInterestRatio,
      totalPrincipalProgress,
      totalInterestProgress
    );
  };

  // MAIN CALC
  const calculateMortgage = () => {
    // 1. Purchase Price
    let purchasePrice = parseFloat(mortgageAmount.value);
    const customAmount = parseFloat(customMortgageAmount.value);
    if (!isNaN(customAmount) && customAmount > parseFloat(mortgageAmount.max)) {
      purchasePrice = customAmount;
    } else if (!isNaN(customAmount) && customAmount >= parseFloat(mortgageAmount.min)) {
      mortgageAmount.value = customAmount;
      purchasePrice = customAmount;
    }
    mortgageAmountDisplay.innerText = formatCurrency(purchasePrice);

    // 2. Annual Rate
    const typedRate = parseFloat(customInterestRate.value);
    if (!isNaN(typedRate) && typedRate >= 1 && typedRate <= 10) {
      interestRate.value = typedRate;
    }
    const baseAnnualRate = parseFloat(interestRate.value) / 100;
    interestRateDisplay.innerText = interestRate.value + "%";

    // 3. Amortization
    amortizationDisplay.innerText = `${amortization.value} years`;
    const years = parseInt(amortization.value, 10);

    // 4. Down Payment
    const downPaymentVal = parseFloat(downPaymentInput.value) || 0;
    const propTypeVal = propertyType.value;

    // Hide comparison block by default
    uninsurableComparison.classList.add("d-none");

    // (A) If DP=0 => old approach
    if (downPaymentVal === 0) {
      insuranceCostDisplay.innerText = "$0.00";
      const scenarioA = runNoInsuranceCalc(purchasePrice, baseAnnualRate, years);
      monthlyPaymentDisplay.innerHTML = formatCurrency(scenarioA.payment) + ` <sup>${scenarioA.freqString}</sup>`;
      fillOutNoInsuranceMainDetails(purchasePrice, baseAnnualRate, years, scenarioA.payment);
      return;
    }

    // (B) If user DP >= 5% => standard insurance logic
    if (downPaymentVal >= 0.05 * purchasePrice) {
      const result = runInsuranceCalc(purchasePrice, downPaymentVal, propTypeVal, baseAnnualRate, years);
      if (!result.scenarioWorks) {
        // fallback
        insuranceCostDisplay.innerText = "N/A";
        monthlyPaymentDisplay.innerHTML = `$0.00 <sup>N/A</sup>`;
        zeroOutResults();
      } else {
        insuranceCostDisplay.innerText = result.insuranceCost;
        monthlyPaymentDisplay.innerHTML =
          formatCurrency(result.payment) + ` <sup>${result.freqString}</sup>`;
        fillOutMainDetails(
          purchasePrice,
          downPaymentVal,
          result.payment,
          baseAnnualRate,
          years,
          result.insuranceCost
        );
      }
      return;
    }

    // (C) If 0 < DP < 5% => Comparison
    const scenarioA = runNoInsuranceCalc(purchasePrice, baseAnnualRate, years); // user scenario ignoring insurance
    // scenario B => forcing 5%
    const forcedDownPayment = purchasePrice * 0.05;
    const scenarioB = runInsuranceCalc(
      purchasePrice,
      forcedDownPayment,
      propTypeVal,
      baseAnnualRate,
      years
    );

    // Show the comparison block
    uninsurableComparison.classList.remove("d-none");

    // scenario A: in main display
    insuranceCostDisplay.innerText = "N/A (Below 5%)";
    monthlyPaymentDisplay.innerHTML =
      formatCurrency(scenarioA.payment) + ` <sup>${scenarioA.freqString}</sup>`;
    fillOutNoInsuranceMainDetails(purchasePrice, baseAnnualRate, years, scenarioA.payment);

    // fill the text for scenario A
    uninsurableUserPayment.innerText =
      scenarioA.payment > 0
        ? formatCurrency(scenarioA.payment) + ` (${scenarioA.freqString})`
        : "$0.00";

    // scenario B
    if (!scenarioB.scenarioWorks) {
      uninsurableMinDownPayment.innerText = "N/A (Even 5% is not insurable)";
    } else {
      uninsurableMinDownPayment.innerText =
        formatCurrency(scenarioB.payment) + ` (${scenarioB.freqString})`;
    }
  };

  // CSV
  const downloadReport = () => {
    const data = [
      ["Mortgage Payment", monthlyPaymentDisplay.innerText],
      ["Mortgage Amount", mortgageAmountDisplay.innerText],
      ["Down Payment", downPaymentInput.value || 0],
      ["Insurance Cost", insuranceCostDisplay.innerText],
      ["Principal Paid", principalPaidDisplay.innerText],
      ["Interest Paid", interestPaidDisplay.innerText],
      ["Total Payment (Payment Tab)", totalPaymentDisplay.innerText],
      ["Balance End of Term", balanceEndOfTermDisplay.innerText],
      ["Effective Amortization", effectiveAmortizationDisplay.innerText],
      ["Term Principal Paid", termPrincipalPaidDisplay.innerText],
      ["Term Interest Paid", termInterestPaidDisplay.innerText],
      ["Term Total Payment", termTotalPaymentDisplay.innerText],
      ["Term Balance End of Term", termBalanceDisplay.innerText],
      ["Term Effective Amortization", termAmortizationDisplay.innerText],
      ["Total Principal Paid (Overall)", totalPrincipalPaidDisplay.innerText],
      ["Total Interest Paid (Overall)", totalInterestPaidDisplay.innerText],
      ["Total Payment (Overall)", totalPaymentOverallDisplay.innerText],
      ["Total Balance End of Term", totalBalanceDisplay.innerText],
      ["Total Effective Amortization", totalAmortizationDisplay.innerText],
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

  // Listeners
  mortgageAmount.addEventListener("input", calculateMortgage);
  customMortgageAmount.addEventListener("input", calculateMortgage);
  interestRate.addEventListener("input", calculateMortgage);
  customInterestRate.addEventListener("input", calculateMortgage);
  amortization.addEventListener("input", calculateMortgage);
  paymentFrequency.addEventListener("change", calculateMortgage);
  loanType.addEventListener("change", calculateMortgage);
  compoundingFrequency.addEventListener("change", calculateMortgage);
  rateTerm.addEventListener("change", calculateMortgage);

  downPaymentInput.addEventListener("input", calculateMortgage);
  propertyType.addEventListener("change", calculateMortgage);

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

  // Slide-in config panel
  configButton.addEventListener("click", () => {
    configPanel.classList.remove("d-none");
    configPanel.style.transform = "translateX(0)";
  });
  closeConfig.addEventListener("click", () => {
    configPanel.style.transform = "translateX(100%)";
  });

  // Download
  downloadReportButton.addEventListener("click", downloadReport);

  // Initial
  calculateMortgage();
});
