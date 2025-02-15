document.addEventListener("DOMContentLoaded", () => {
  /************************************************************
   * 1) UTILITY FUNCTIONS
   ************************************************************/
  function $(id) {
    return document.getElementById(id);
  }

  function parseCurrency(str) {
    return parseFloat(str.replace(/,/g, "")) || 0;
  }

  function formatInt(num) {
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined); // no decimals
  }

  function formatCurrency(num) {
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  function formatIntCurrency(num) {
    if (isNaN(num)) return "$0";
    return "$" + parseInt(num, 10).toLocaleString(undefined);
  }

  /************************************************************
   * 2) COMPOUNDING / MORTGAGE CALC LOGIC
   ************************************************************/
  // Convert nominal rate to effective annual given compounding
  function getEffectiveRate(nominal, compFreq) {
    switch (compFreq) {
      case "12": // monthly
        return Math.pow(1 + nominal / 12, 12) - 1;
      case "26": // bi-weekly
        return Math.pow(1 + nominal / 26, 26) - 1;
      case "52": // weekly
        return Math.pow(1 + nominal / 52, 52) - 1;
      case "365": // daily
        return Math.pow(1 + nominal / 365, 365) - 1;
      default:
        // "2" => semi-annually (typical in Canada)
        return Math.pow(1 + nominal / 2, 2) - 1;
    }
  }

  // Periodic rate for a given payment frequency
  function getPeriodicRate(nominal, freq, compFreq) {
    const annualEff = getEffectiveRate(nominal, compFreq);
    return Math.pow(1 + annualEff, 1 / freq) - 1;
  }

  // Standard mortgage formula for payment
  function calcPmt(principal, perRate, totalN) {
    if (perRate <= 0) {
      // if interest is 0, just principal / total payments
      return principal / totalN;
    }
    // M = P * [ i(1+i)^n ] / [ (1+i)^n -1 ]
    return (
      principal *
      ((perRate * Math.pow(1 + perRate, totalN)) /
        (Math.pow(1 + perRate, totalN) - 1))
    );
  }

  // Canada Mortgage Insurance Rate (CMHC-like)
  function getInsuranceRate(ltv) {
    if (ltv <= 0.80) return 0;     // no insurance needed if LTV <= 80%
    if (ltv <= 0.85) return 0.018; // 1.80%
    if (ltv <= 0.90) return 0.024; // 2.40%
    if (ltv <= 0.95) return 0.031; // 3.10%
    return null; // above 95% not insurable
  }

  /**
   * doAmort: Full amortization for a mortgage (returns final balance, total interest).
   *  - lumpsumAnnual: extra lump sum each "year" (after freq payments).
   *  - lumpsumOnce: immediate single lumpsum before schedule starts.
   *  - extraFrac: fraction of extra payment each period (like accelerated).
   *  - isIO: interest-only if true.
   */
  function doAmort(
    principal,
    perRate,
    freq,
    lumpsumAnnual,
    lumpsumOnce,
    extraFrac,
    totalN,
    isIO
  ) {
    let bal = principal;
    let totInt = 0;
    let totPrin = 0;

    // Immediate lumpsum once
    if (lumpsumOnce > 0 && bal > 0) {
      const used = Math.min(bal, lumpsumOnce);
      bal -= used;
      totPrin += used;
      if (bal < 0) bal = 0;
    }

    // base mortgage payment
    const basePayment = calcPmt(principal, perRate, totalN);

    let yearlyCount = 0;
    for (let i = 0; i < totalN; i++) {
      if (bal <= 0) break;
      const interestPart = bal * perRate;
      totInt += interestPart;

      let princPart = 0;
      if (!isIO) {
        const full = basePayment + basePayment * extraFrac;
        princPart = full - interestPart;
      } else {
        // interest-only
        const iOnly = interestPart;
        const full = iOnly + iOnly * extraFrac;
        princPart = full - iOnly;
      }
      if (princPart < 0) princPart = 0;

      bal -= princPart;
      totPrin += princPart;
      if (bal < 0) bal = 0;

      yearlyCount++;
      // apply lumpsum each "year" = after freq payments
      if (yearlyCount === freq) {
        yearlyCount = 0;
        if (lumpsumAnnual > 0 && bal > 0) {
          let lum = Math.min(bal, lumpsumAnnual);
          bal -= lum;
          totPrin += lum;
          if (bal < 0) bal = 0;
        }
      }
    }
    return { finalBalance: bal, totalInterest: totInt, totalPrincipal: totPrin };
  }

  /**
   * doPartialAmort: same logic but only for a partial number of payments.
   *  Often used to see the balance at the end of a “term,” not the full amort.
   */
  function doPartialAmort(
    principal,
    perRate,
    freq,
    lumpsumAnnual,
    lumpsumOnce,
    extraFrac,
    partialN,
    isIO
  ) {
    let bal = principal;
    let partialInt = 0;

    // immediate lumpsum
    if (lumpsumOnce > 0 && bal > 0) {
      let used = Math.min(bal, lumpsumOnce);
      bal -= used;
      if (bal < 0) bal = 0;
    }

    // approximate basePayment from a 30-year reference
    const basePayment = calcPmt(principal, perRate, freq * 30);

    let yCount = 0;
    for (let i = 0; i < partialN; i++) {
      if (bal <= 0) break;
      const interestPart = bal * perRate;
      partialInt += interestPart;

      let princPart = 0;
      if (!isIO) {
        const full = basePayment + basePayment * extraFrac;
        princPart = full - interestPart;
      } else {
        // interest-only
        const iOnly = interestPart;
        const full = iOnly + iOnly * extraFrac;
        princPart = full - iOnly;
      }
      if (princPart < 0) princPart = 0;

      bal -= princPart;
      if (bal < 0) bal = 0;

      yCount++;
      if (yCount === freq) {
        yCount = 0;
        if (lumpsumAnnual > 0 && bal > 0) {
          let lum = Math.min(bal, lumpsumAnnual);
          bal -= lum;
          if (bal < 0) bal = 0;
        }
      }
    }
    return { finalBalance: bal, totalInterest: partialInt };
  }

  /**
   * findPayoffN: find how many payments until balance is fully paid off
   */
  function findPayoffN(
    principal,
    perRate,
    freq,
    lumpsumAnnual,
    lumpsumOnce,
    extraFrac,
    isIO
  ) {
    let bal = principal;
    let count = 0;

    // lumpsum once
    if (lumpsumOnce > 0 && bal > 0) {
      const used = Math.min(bal, lumpsumOnce);
      bal -= used;
      if (bal < 0) bal = 0;
    }

    // approximate basePayment from 30-year
    const basePayment = calcPmt(principal, perRate, freq * 30);

    let yCount = 0;
    while (bal > 0 && count < 100000) {
      const interestPart = bal * perRate;
      let princPart = 0;
      if (!isIO) {
        const full = basePayment + basePayment * extraFrac;
        princPart = full - interestPart;
      } else {
        const iOnly = interestPart;
        const full = iOnly + iOnly * extraFrac;
        princPart = full - iOnly;
      }
      if (princPart < 0) princPart = 0;

      bal -= princPart;
      if (bal < 0) bal = 0;
      count++;

      yCount++;
      if (yCount === freq) {
        yCount = 0;
        if (lumpsumAnnual > 0 && bal > 0) {
          let lum = Math.min(bal, lumpsumAnnual);
          bal -= lum;
          if (bal < 0) bal = 0;
        }
      }
    }
    return count;
  }

  /************************************************************
   * 3) DOM ELEMENTS
   ************************************************************/
  // Main scenario inputs & outputs
  const mortgageSizeInput = $("mortgageSize");
  const mortgageSizeSlider = $("mortgageSizeSlider");
  const mortgageSizeSliderValue = $("mortgageSizeSliderValue");

  const downPaymentInput = $("downPaymentInput");
  const downPaymentSlider = $("downPaymentSlider");
  const downPaymentPercentDisplay = $("downPaymentPercentDisplay");
  const downPaymentSliderValue = $("downPaymentSliderValue");

  const propertyTax = $("propertyTax");
  const propertyTaxMonthly = $("propertyTaxMonthly");

  const condoFees = $("condoFees");
  const condoFeesSlider = $("condoFeesSlider");
  const heat = $("heat");
  const heatSlider = $("heatSlider");
  const otherExpenses = $("otherExpenses");
  const otherExpensesSlider = $("otherExpensesSlider");

  const paymentFrequencySelect = $("paymentFrequency");
  const fixedRateBtn = $("fixedRateBtn");
  const variableRateBtn = $("variableRateBtn");
  const interestRateInput = $("interestRateInput");
  const interestRateSlider = $("interestRateSlider");
  const interestRateSliderValue = $("interestRateSliderValue");
  const mortgageTermSelect = $("mortgageTermSelect");
  const amortizationRange = $("amortization");
  const amortizationDisplay = $("amortizationDisplay");

  const fasterFrequencySlider = $("fasterFrequencySlider");
  const fasterFrequencyValue = $("fasterFrequencyValue");
  const fasterFrequencyDropdown = $("fasterFrequencyDropdown");
  const includesExtraLine = $("includesExtraLine");
  const extraPaymentPercent = $("extraPaymentPercent");

  const oneTimePayment = $("oneTimePayment");
  const oneTimePaymentSlider = $("oneTimePaymentSlider");
  const annualPrepayment = $("annualPrepayment");
  const annualPrepaymentSlider = $("annualPrepaymentSlider");

  const loanType = $("loanType");
  const compoundingFrequency = $("compoundingFrequency");

  const totalMonthlyCost = $("totalMonthlyCost");
  const monthlyMortgageItem = $("monthlyMortgageItem");
  const mortgageSizeDisplay = $("mortgageSizeDisplay");
  const downPaymentDisplay = $("downPaymentDisplay");
  const insuranceCostDisplay2 = $("insuranceCostDisplay2");
  const mortgagePaymentDetails = $("mortgagePaymentDetails");
  const netMortgageInsurance = $("netMortgageInsurance");
  const interestOverTerm = $("interestOverTerm");
  const interestSavingLabel = $("interestSavingLabel");
  const balanceEndOfTerm = $("balanceEndOfTerm");
  const effectiveAmortization = $("effectiveAmortization");
  const fasterAmortLabel = $("fasterAmortLabel");

  const homeExpensesItem = $("homeExpensesItem");
  const otherExpensesItem = $("otherExpensesItem");
  const rentalIncomeItem = $("rentalIncomeItem");

  const rentalIncomeToggle = $("rentalIncomeToggle");
  const rentalIncomeSection = $("rentalIncomeSection");
  const rentalIncomeYearly = $("rentalIncomeYearly");
  const rentalIncomeMonthly = $("rentalIncomeMonthly");

  const uninsurableComparison = $("uninsurableComparison");
  const uninsurableUserPayment = $("uninsurableUserPayment");
  const uninsurableMinDownPayment = $("uninsurableMinDownPayment");

  // Scenario B
  const scenarioBMortgageAmount = $("scenarioBMortgageAmount");
  const scenarioBDownPayment = $("scenarioBDownPayment");
  const scenarioBInterestRate = $("scenarioBInterestRate");
  const scenarioBAmortization = $("scenarioBAmortization");
  const scenarioBPaymentFrequency = $("scenarioBPaymentFrequency");
  const scenarioBResult = $("scenarioBResult");
  const scenarioBPayment = $("scenarioBPayment");
  const scenarioBInterestPaid = $("scenarioBInterestPaid");
  const scenarioBInsurance = $("scenarioBInsurance");
  const calculateScenarioBButton = $("calculateScenarioB");

  const downloadReportButton = $("downloadReport");
  const applyNowBtn = $("applyNowBtn");

  // Charts-related
  const showChartsBtn = $("showChartsBtn");

  // The modal & refresh button inside it
  const chartsModalElem = document.getElementById("chartsModal");
  const chartsModal = new bootstrap.Modal(chartsModalElem);
  const refreshChartsBtn = $("refreshChartsBtn");

  // Chart.js objects
  let chartJsLoaded = false;
  let amortChart, paymentChart, totalCostChart;

  /************************************************************
   * 4) PROPERTY TAX & RENTAL SYNC
   ************************************************************/
  function handlePropertyTaxSync() {
    let rawAnn = propertyTax.value.replace(/,/g, "");
    let rawMo = propertyTaxMonthly.value.replace(/,/g, "");
    let valAnn = parseFloat(rawAnn) || 0;
    let valMo = parseFloat(rawMo) || 0;

    if (document.activeElement === propertyTax) {
      // If user is editing annual tax, auto-update monthly
      valMo = valAnn / 12;
      propertyTaxMonthly.value = formatInt(valMo);
    } else if (document.activeElement === propertyTaxMonthly) {
      // If user is editing monthly tax, auto-update annual
      valAnn = valMo * 12;
      propertyTax.value = formatInt(valAnn);
    }
  }

  function handleRentalIncomeSync() {
    let rawYr = rentalIncomeYearly.value.replace(/,/g, "");
    let rawMo = rentalIncomeMonthly.value.replace(/,/g, "");
    let valYr = parseFloat(rawYr) || 0;
    let valMo = parseFloat(rawMo) || 0;

    if (document.activeElement === rentalIncomeYearly) {
      valMo = valYr / 12;
      rentalIncomeMonthly.value = formatInt(valMo);
    } else if (document.activeElement === rentalIncomeMonthly) {
      valYr = valMo * 12;
      rentalIncomeYearly.value = formatInt(valYr);
    }
  }

  /************************************************************
   * 5) MAIN CALCULATION FOR PRIMARY SCENARIO
   ************************************************************/
  let lastCalcResults = {
    basePayment: 0,
    totalMonthlyCostValue: 0,
    amortizationYears: 25,
    financed: 0,
    partialInterest: 0,
    partialBalance: 0,
    interestSaved: 0,
    payoffYears: 25
  };

  function calculateMortgage() {
    handlePropertyTaxSync();
    handleRentalIncomeSync();

    // Hide comparison alert if previously shown
    uninsurableComparison.classList.add("d-none");

    // Accelerated % from dropdown
    const xPct = parseInt(fasterFrequencyDropdown.value || "0", 10);
    if (xPct > 0) {
      includesExtraLine.classList.remove("d-none");
      extraPaymentPercent.textContent = xPct + "%";
    } else {
      includesExtraLine.classList.add("d-none");
      extraPaymentPercent.textContent = "0%";
    }

    // 1) Mortgage & Down Payment
    const purchaseVal = parseCurrency(mortgageSizeInput.value);
    const dpVal = parseCurrency(downPaymentInput.value);

    // 2) Interest Rate
    let nominalRate = parseFloat(interestRateInput.value) / 100 || 0;
    // Example logic: add +1% for variable
    if (variableRateBtn && variableRateBtn.checked) {
      nominalRate += 0.01;
    }

    // 3) Payment Frequency
    let baseFreq = 12;
    switch (paymentFrequencySelect.value) {
      case "weekly-standard":
        baseFreq = 52;
        break;
      case "daily":
        baseFreq = 365;
        break;
      case "semiannual":
        baseFreq = 2;
        break;
      // default monthly
    }

    // Possibly override freq with accelerated slider
    let freqSliderVal = parseInt(fasterFrequencySlider.value || "0", 10);
    let actualFreq = baseFreq;
    if (xPct > 0 && freqSliderVal > 0) {
      actualFreq = freqSliderVal;
    }
    if (fasterFrequencyValue) {
      fasterFrequencyValue.textContent = freqSliderVal.toString();
    }

    // 4) Compounding frequency
    let compFreqVal = compoundingFrequency.value || "2";
    let perRate = getPeriodicRate(nominalRate, actualFreq, compFreqVal);

    // 5) Amortization
    let years = parseInt(amortizationRange.value, 10) || 25;
    years = clamp(years, 5, 30);
    amortizationDisplay.textContent = years.toString();

    // 6) Mortgage Insurance if <20% down and purchase <=1.5M
    const loan = purchaseVal - dpVal;
    let insurance = 0;
    if (dpVal < 0.2 * purchaseVal && purchaseVal <= 1500000 && loan > 0) {
      const ltv = loan / purchaseVal;
      const iRate = getInsuranceRate(ltv);
      if (iRate !== null) insurance = iRate * loan;
    }
    const financed = loan + insurance;

    // 7) Prepayment, lumpsums
    let oneT = parseCurrency(oneTimePayment.value);
    let annT = parseCurrency(annualPrepayment.value);
    const isIO = loanType.value === "interestOnly";
    const extraFrac = xPct / 100;
    const totalN = actualFreq * years;

    // do full amort
    const mainRes = doAmort(
      financed,
      perRate,
      actualFreq,
      annT,
      oneT,
      extraFrac,
      totalN,
      isIO
    );
    const finalBal = mainRes.finalBalance;
    const totalInt = mainRes.totalInterest;

    // partial term amort
    let chosenTerm = parseInt(mortgageTermSelect.value || "5", 10);
    let partialN = actualFreq * chosenTerm;
    const partialRes = doPartialAmort(
      financed,
      perRate,
      actualFreq,
      annT,
      oneT,
      extraFrac,
      partialN,
      isIO
    );

    // approximate payment
    let basePay = 0;
    if (!isIO) {
      basePay = calcPmt(financed, perRate, totalN);
      basePay += basePay * extraFrac;
    } else {
      const iOnly = financed * perRate;
      basePay = iOnly + iOnly * extraFrac;
    }

    // frequency label
    let freqLabel = "/month";
    switch (paymentFrequencySelect.value) {
      case "weekly-standard":
        freqLabel = "/week";
        break;
      case "daily":
        freqLabel = "/day";
        break;
      case "semiannual":
        freqLabel = "/semi-annual";
        break;
    }

    // Update DOM for main scenario
    monthlyMortgageItem.textContent = formatCurrency(basePay);
    mortgagePaymentDetails.textContent = formatCurrency(basePay) + freqLabel;
    netMortgageInsurance.textContent = formatCurrency(financed);
    interestOverTerm.textContent = formatCurrency(partialRes.totalInterest);
    balanceEndOfTerm.textContent = formatCurrency(partialRes.finalBalance);

    // baseline scenario => interest saving
    let baseline = doAmort(financed, perRate, actualFreq, 0, 0, 0, totalN, isIO);
    let saving = baseline.totalInterest - totalInt;
    if (saving > 0) {
      interestSavingLabel.textContent = `(INTEREST SAVING ${formatCurrency(saving)})`;
    } else {
      interestSavingLabel.textContent = `(INTEREST SAVING $0)`;
    }

    // effective amort
    let payoffCount = findPayoffN(
      financed,
      perRate,
      actualFreq,
      annT,
      oneT,
      extraFrac,
      isIO
    );
    let effYears = Math.floor(payoffCount / actualFreq);
    let frac = payoffCount / actualFreq - effYears;
    let effMo = Math.round(frac * 12);
    effectiveAmortization.textContent = `${effYears} yr ${effMo} mo`;
    if (effYears < years) {
      let diff = years - effYears;
      fasterAmortLabel.textContent = `(${diff} years faster)`;
    } else {
      fasterAmortLabel.textContent = "(0 years faster)";
    }

    // If down payment <5%, show uninsurable comparison
    if (dpVal > 0 && dpVal < 0.05 * purchaseVal) {
      uninsurableComparison.classList.remove("d-none");
      uninsurableUserPayment.textContent = formatCurrency(basePay);
      // e.g., 98% version just to illustrate a small difference
      uninsurableMinDownPayment.textContent = formatCurrency(basePay * 0.98);
    }

    // home expenses + rental
    let cFee = parseCurrency(condoFees.value);
    let hFee = parseCurrency(heat.value);
    let oFee = parseCurrency(otherExpenses.value);

    let rent = 0;
    if (rentalIncomeToggle.checked) {
      let yRent = parseCurrency(rentalIncomeYearly.value);
      let mRent = parseCurrency(rentalIncomeMonthly.value);
      rent = yRent > 0 ? yRent / 12 : mRent;
    }

    let moTax = parseCurrency(propertyTaxMonthly.value);
    let moHome = moTax + cFee + hFee;
    let moTotal = basePay + moHome + oFee - rent;
    homeExpensesItem.textContent = formatCurrency(moHome);
    otherExpensesItem.textContent = formatCurrency(oFee);
    rentalIncomeItem.textContent =
      rent > 0 ? `- ${formatCurrency(rent)}` : "$0.00";

    if (moTotal < 0) {
      totalMonthlyCost.textContent = "$0.00";
      lastCalcResults.totalMonthlyCostValue = 0;
    } else {
      totalMonthlyCost.textContent = formatCurrency(moTotal) + freqLabel;
      lastCalcResults.totalMonthlyCostValue = moTotal;
    }

    mortgageSizeDisplay.textContent = formatIntCurrency(purchaseVal);
    downPaymentDisplay.textContent = formatIntCurrency(dpVal);
    insuranceCostDisplay2.textContent = formatCurrency(insurance);

    // Save results for potential chart usage
    lastCalcResults.basePayment = basePay;
    lastCalcResults.amortizationYears = years;
    lastCalcResults.financed = financed;
    lastCalcResults.partialInterest = partialRes.totalInterest;
    lastCalcResults.partialBalance = partialRes.finalBalance;
    lastCalcResults.interestSaved = saving;
    lastCalcResults.payoffYears = effYears + effMo / 12;
  }

  /************************************************************
   * 6) SCENARIO B CALCULATION (ACCURATE)
   ************************************************************/
  function calculateScenarioB() {
    scenarioBResult.classList.remove("d-none");

    // 1) Parse scenario B inputs
    const bMortVal = parseCurrency(scenarioBMortgageAmount.value);
    const bDownVal = parseCurrency(scenarioBDownPayment.value);
    const bRateVal = parseFloat(scenarioBInterestRate.value) / 100 || 0;
    const bAmortVal = parseInt(scenarioBAmortization.value, 10) || 25;

    // Payment Frequency
    let bFreq = 12; // monthly default
    switch (scenarioBPaymentFrequency.value) {
      case "biweekly":
      case "biweekly-standard":
        bFreq = 26;
        break;
      case "weekly-accelerated":
      case "weekly-standard":
        bFreq = 52;
        break;
      case "monthly":
      default:
        bFreq = 12;
        break;
    }

    // 2) Determine if insurance is needed
    const bLoan = bMortVal - bDownVal;
    let bInsurance = 0;
    if (bDownVal < 0.2 * bMortVal && bMortVal <= 1500000 && bLoan > 0) {
      const bLTV = bLoan / bMortVal;
      const bIRate = getInsuranceRate(bLTV);
      if (bIRate !== null) bInsurance = bIRate * bLoan;
    }
    const bFinanced = bLoan + bInsurance;

    // 3) We’ll match main scenario’s compounding or default to semi-annual
    let bCompFreq = compoundingFrequency.value || "2";
    let bPerRate = getPeriodicRate(bRateVal, bFreq, bCompFreq);

    // 4) Full amort for scenario B
    let bTotalN = bFreq * bAmortVal;
    // We'll do standard (no lumpsums, no extraFrac, not interest-only)
    const bIsIO = false; 
    const bMainRes = doAmort(bFinanced, bPerRate, bFreq, 0, 0, 0, bTotalN, bIsIO);

    // Payment
    let bBasePayment = calcPmt(bFinanced, bPerRate, bTotalN);

    // Show e.g. "Payment /month" or "/biweekly"
    let scenarioBFreqLabel = "/month";
    if (bFreq === 26) scenarioBFreqLabel = "/biweekly";
    else if (bFreq === 52) scenarioBFreqLabel = "/weekly";

    scenarioBPayment.textContent = formatCurrency(bBasePayment) + scenarioBFreqLabel;
    scenarioBInterestPaid.textContent = formatCurrency(bMainRes.totalInterest);
    scenarioBInsurance.textContent = formatCurrency(bInsurance);
  }

  /************************************************************
   * 7) EVENT HANDLERS FOR INPUT & SLIDERS
   ************************************************************/
  // Generic integer fields => partial on input, finalize on blur
  function handleIntegerInput(e) {
    let raw = e.target.value.replace(/,/g, "");
    raw = raw.replace(/[^\d]/g, "");
    e.target.value = raw;
    calculateMortgage();
  }

  function finalizeIntegerInput(e) {
    let raw = e.target.value.replace(/,/g, "");
    if (raw === "") {
      e.target.value = "";
      calculateMortgage();
      return;
    }
    let num = parseFloat(raw) || 0;
    e.target.value = formatInt(num);

    // Mortgage size => sync slider
    if (e.target === mortgageSizeInput && mortgageSizeSlider) {
      const maxVal = parseInt(mortgageSizeSlider.max, 10) || 3000000;
      if (num > maxVal) {
        mortgageSizeSlider.value = maxVal;
        mortgageSizeSliderValue.textContent = `$${formatInt(num)}`;
      } else {
        mortgageSizeSlider.value = String(num);
        mortgageSizeSliderValue.textContent = `$${formatInt(num)}`;
      }
    }

    // Down payment => sync slider
    if (e.target === downPaymentInput) {
      syncDownPaymentSlider();
    }

    // Property tax, rental sync
    if (e.target === propertyTax || e.target === propertyTaxMonthly) {
      handlePropertyTaxSync();
    }
    if (e.target === rentalIncomeYearly || e.target === rentalIncomeMonthly) {
      handleRentalIncomeSync();
    }

    calculateMortgage();
  }

  function syncDownPaymentSlider() {
    let dpVal = parseCurrency(downPaymentInput.value);
    let mortVal = parseCurrency(mortgageSizeInput.value);
    if (!downPaymentSlider) return;
    if (mortVal <= 0) {
      downPaymentSlider.value = "0";
      downPaymentSliderValue.textContent = "$0";
      downPaymentPercentDisplay.textContent = "0%";
      return;
    }
    let pct = (dpVal / mortVal) * 100;
    pct = clamp(pct, 0, 100);
    downPaymentSlider.value = pct.toFixed(0);
    downPaymentSliderValue.textContent = "$" + formatInt(dpVal);
    downPaymentPercentDisplay.textContent = `${pct.toFixed(0)}%`;
  }

  // Interest rate => partial decimal input
  function handleInterestRateInput(e) {
    let raw = e.target.value.replace(/[^\d.]/g, "");
    if (raw === "") {
      interestRateSlider.value = "0";
      interestRateSliderValue.textContent = "0%";
      e.target.value = "";
      calculateMortgage();
      return;
    }
    let val = parseFloat(raw);
    if (isNaN(val)) val = 0;
    interestRateSlider.value = val.toString();
    interestRateSliderValue.textContent = val + "%";
    e.target.value = raw;
    calculateMortgage();
  }

  function finalizeInterestRate(e) {
    let raw = e.target.value.replace(/[^\d.]/g, "");
    if (raw === "") {
      e.target.value = "";
      interestRateSlider.value = "0";
      interestRateSliderValue.textContent = "0%";
      calculateMortgage();
      return;
    }
    let val = parseFloat(raw) || 0;
    let twoDec = val.toFixed(2);
    e.target.value = twoDec;
    interestRateSlider.value = twoDec;
    interestRateSliderValue.textContent = twoDec + "%";
    calculateMortgage();
  }

  // Sliders
  function handleMortgageSizeSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    mortgageSizeInput.value = String(val);
    mortgageSizeSliderValue.textContent = `$${formatInt(val)}`;
    calculateMortgage();
  }

  function handleDownPaymentSlider(e) {
    let mortVal = parseInt(mortgageSizeSlider.value, 10) || 0;
    let sVal = parseInt(downPaymentSlider.value, 10) || 0;
    let dp = Math.round((sVal / 100) * mortVal);
    downPaymentInput.value = String(dp);
    downPaymentSliderValue.textContent = "$" + formatInt(dp);
    downPaymentPercentDisplay.textContent = sVal + "%";
    calculateMortgage();
  }

  function handleCondoFeesSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    condoFees.value = String(val);
    calculateMortgage();
  }

  function handleHeatSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    heat.value = String(val);
    calculateMortgage();
  }

  function handleOtherExpensesSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    otherExpenses.value = String(val);
    calculateMortgage();
  }

  /************************************************************
   * 8) INIT + FIRST CALC
   ************************************************************/
  function initSync() {
    mortgageSizeSlider.max = "3000000";
    mortgageSizeSlider.value = "500000";
    mortgageSizeSliderValue.textContent = "$500,000";

    downPaymentSlider.value = "20";
    downPaymentSliderValue.textContent = "$100,000";
    downPaymentPercentDisplay.textContent = "20%";

    interestRateSlider.value = "4.24";
    interestRateInput.value = "4.24";
    interestRateSliderValue.textContent = "4.24%";

    condoFeesSlider.value = "0";
    heatSlider.value = "0";
    otherExpensesSlider.value = "0";

    fasterFrequencySlider.value = "0";
    fasterFrequencyValue.textContent = "0";
    fasterFrequencyDropdown.value = "0";
    oneTimePayment.value = "0";
    oneTimePaymentSlider.value = "0";
    annualPrepayment.value = "0";
    annualPrepaymentSlider.value = "0";

    mortgageTermSelect.value = "5";
    amortizationRange.value = "25";
    amortizationDisplay.textContent = "25";
    includesExtraLine.style.display = "none";

    mortgageSizeInput.value = "500,000";
    downPaymentInput.value = "100,000";
    propertyTax.value = "0";
    propertyTaxMonthly.value = "0";
    condoFees.value = "0";
    heat.value = "0";
    otherExpenses.value = "0";
    oneTimePayment.value = "0";
    annualPrepayment.value = "0";

    // Scenario B defaults
    scenarioBMortgageAmount.value = "";
    scenarioBDownPayment.value = "";
    scenarioBInterestRate.value = "";
    scenarioBAmortization.value = "";
    scenarioBPaymentFrequency.value = "monthly";
  }

  /************************************************************
   * 9) ADD EVENT LISTENERS
   ************************************************************/
  [
    mortgageSizeInput,
    downPaymentInput,
    propertyTax,
    propertyTaxMonthly,
    condoFees,
    heat,
    otherExpenses,
    oneTimePayment,
    annualPrepayment,
    rentalIncomeYearly,
    rentalIncomeMonthly
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", handleIntegerInput);
    el.addEventListener("blur", finalizeIntegerInput);
  });

  interestRateInput.addEventListener("input", handleInterestRateInput);
  interestRateInput.addEventListener("blur", finalizeInterestRate);

  interestRateSlider.addEventListener("input", () => {
    let val = parseFloat(interestRateSlider.value) || 0;
    let valStr = val.toFixed(2);
    interestRateInput.value = valStr;
    interestRateSliderValue.textContent = valStr + "%";
    calculateMortgage();
  });

  mortgageSizeSlider.addEventListener("input", handleMortgageSizeSlider);
  downPaymentSlider.addEventListener("input", handleDownPaymentSlider);
  condoFeesSlider.addEventListener("input", handleCondoFeesSlider);
  heatSlider.addEventListener("input", handleHeatSlider);
  otherExpensesSlider.addEventListener("input", handleOtherExpensesSlider);

  paymentFrequencySelect.addEventListener("change", calculateMortgage);
  fixedRateBtn.addEventListener("change", calculateMortgage);
  variableRateBtn.addEventListener("change", calculateMortgage);
  mortgageTermSelect.addEventListener("change", calculateMortgage);

  amortizationRange.addEventListener("input", (e) => {
    amortizationDisplay.textContent = e.target.value;
    calculateMortgage();
  });

  loanType.addEventListener("change", calculateMortgage);
  compoundingFrequency.addEventListener("change", calculateMortgage);

  fasterFrequencySlider.addEventListener("input", (e) => {
    fasterFrequencyValue.textContent = e.target.value;
    calculateMortgage();
  });

  fasterFrequencyDropdown.addEventListener("change", calculateMortgage);

  oneTimePaymentSlider.addEventListener("input", (e) => {
    oneTimePayment.value = String(parseInt(e.target.value, 10) || 0);
    calculateMortgage();
  });
  annualPrepaymentSlider.addEventListener("input", (e) => {
    annualPrepayment.value = String(parseInt(e.target.value, 10) || 0);
    calculateMortgage();
  });

  rentalIncomeToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      rentalIncomeSection.classList.remove("d-none");
    } else {
      rentalIncomeSection.classList.add("d-none");
      rentalIncomeYearly.value = "0";
      rentalIncomeMonthly.value = "0";
    }
    calculateMortgage();
  });

  calculateScenarioBButton.addEventListener("click", calculateScenarioB);

  downloadReportButton.addEventListener("click", () => {
    const csvRows = [];
    csvRows.push("Mortgage Size,Down Payment,Payment Frequency,Rate");
    csvRows.push(
      [
        parseCurrency(mortgageSizeInput.value),
        parseCurrency(downPaymentInput.value),
        paymentFrequencySelect.value,
        interestRateInput.value
      ].join(",")
    );
    csvRows.push(",,,"); // blank line
    csvRows.push("Monthly Payment," + totalMonthlyCost.textContent);

    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "MortgageCalculationReport.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  applyNowBtn.addEventListener("click", () => {
    // Adjust link if needed
    window.location.href = "https://thegenesisgroup.ca/apply-now/";
  });

  // Initialize + first calculation
  initSync();
  calculateMortgage();

  /************************************************************
   * 10) BOOTSTRAP POPOVERS
   ************************************************************/
  const popoverTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="popover"]')
  );
  popoverTriggerList.forEach((el) => {
    const pop = new bootstrap.Popover(el, { trigger: "manual" });
    el.addEventListener("click", () => {
      pop.toggle();
      // auto-hide after 3 seconds
      setTimeout(() => {
        pop.hide();
      }, 3000);
    });
  });

  // For potential iFrame usage
  window.addEventListener("message", (event) => {
    if (event.data.requestHeight) {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ height }, event.origin);
    }
  });

  /************************************************************
   * 11) CHART.JS - LAZY LOAD + BUILD/UPDATE CHARTS via Modal
   ************************************************************/
  function loadChartJS(callback) {
    if (chartJsLoaded) {
      callback();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => {
      chartJsLoaded = true;
      callback();
    };
    document.head.appendChild(script);
  }

  // Build or rebuild all charts
  function buildCharts() {
    // Destroy if existing
    if (amortChart) amortChart.destroy();
    if (paymentChart) paymentChart.destroy();
    if (totalCostChart) totalCostChart.destroy();

    // Then create them fresh
    createAmortChart();
    createPaymentComparisonChart();
    createTotalCostChart();
  }

  // Listen for modal to open; load & build charts
  chartsModalElem.addEventListener("show.bs.modal", () => {
    loadChartJS(buildCharts);
  });

  // Refresh button inside modal (optional if user changes inputs)
  if (refreshChartsBtn) {
    refreshChartsBtn.addEventListener("click", () => {
      if (!chartJsLoaded) {
        loadChartJS(buildCharts);
      } else {
        buildCharts();
      }
    });
  }

  // Show the modal when user clicks "Show Mortgage Charts"
  showChartsBtn.addEventListener("click", () => {
    chartsModal.show();
  });

  /************************************************************
   * 12) CHART CREATION FUNCTIONS
   ************************************************************/
  function createAmortChart() {
    const financed = lastCalcResults.financed;
    const freq = 12; // for charting, we'll illustrate monthly
    const totalYears = Math.min(lastCalcResults.amortizationYears, 30);

    let nominal =
      parseFloat(interestRateInput.value) / 100 +
      (variableRateBtn.checked ? 0.01 : 0);
    let cFreq = compoundingFrequency.value || "2";
    let perRate = getPeriodicRate(nominal, freq, cFreq);

    const lumpsumAnnual = parseCurrency(annualPrepayment.value);
    const lumpsumOnce = parseCurrency(oneTimePayment.value);
    const extraFrac = parseInt(fasterFrequencyDropdown.value) / 100;
    const isIO = loanType.value === "interestOnly";

    let bal = financed;
    let yearLabels = [];
    let principalData = [];
    let interestData = [];

    // approximate basePayment from 30-year reference
    let basePayment = calcPmt(financed, perRate, freq * 30);
    if (isIO) {
      // interest-only
      const iOnly = financed * perRate;
      basePayment = iOnly + iOnly * extraFrac;
    } else {
      basePayment += basePayment * extraFrac;
    }

    // lumpsum once
    if (lumpsumOnce > 0) {
      let used = Math.min(bal, lumpsumOnce);
      bal -= used;
    }

    for (let y = 1; y <= totalYears; y++) {
      let yearlyInt = 0;
      let yearlyPrin = 0;
      for (let m = 0; m < freq; m++) {
        if (bal <= 0) break;
        let iPart = bal * perRate;
        yearlyInt += iPart;
        // If not IO, standard payment minus interest
        let pPart = basePayment - iPart;
        if (pPart < 0) pPart = 0;
        if (isIO) {
          const iOnly = iPart;
          const full = iOnly + iOnly * extraFrac;
          pPart = full - iOnly;
        }
        bal -= pPart;
        if (bal < 0) bal = 0;
        yearlyPrin += pPart;
      }
      // lumpsum annually
      if (lumpsumAnnual > 0 && bal > 0) {
        let lum = Math.min(bal, lumpsumAnnual);
        bal -= lum;
        yearlyPrin += lum;
      }
      yearLabels.push(`Year ${y}`);
      principalData.push(yearlyPrin);
      interestData.push(yearlyInt);

      if (bal <= 0) break;
    }

    const ctx = $("amortizationChart").getContext("2d");
    amortChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: yearLabels,
        datasets: [
          {
            label: "Principal Paid",
            data: principalData,
            backgroundColor: "#0F7570",
            stack: "combined"
          },
          {
            label: "Interest Paid",
            data: interestData,
            backgroundColor: "#B38D97",
            stack: "combined"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true }
        }
      }
    });
  }

  function createPaymentComparisonChart() {
    const financed = lastCalcResults.financed;
    const isIO = loanType.value === "interestOnly";

    function calcPaymentForFreq(freqVal, xFrac) {
      let nominal =
        parseFloat(interestRateInput.value) / 100 +
        (variableRateBtn.checked ? 0.01 : 0);
      let cFreq = compoundingFrequency.value || "2";
      let perR = getPeriodicRate(nominal, freqVal, cFreq);
      let totalN = freqVal * lastCalcResults.amortizationYears;

      if (!isIO) {
        let p = calcPmt(financed, perR, totalN);
        return p + p * xFrac;
      } else {
        const iOnly = financed * perR;
        return iOnly + iOnly * xFrac;
      }
    }

    const monthlyPay = calcPaymentForFreq(12, 0);
    const biWeeklyPay = calcPaymentForFreq(26, 0);

    const userFreq = parseInt(fasterFrequencySlider.value || "0", 10) || 12;
    const userFrac = parseInt(fasterFrequencyDropdown.value || "0", 10) / 100;
    const accelerated = calcPaymentForFreq(userFreq, userFrac);

    const ctx = $("paymentComparisonChart").getContext("2d");
    paymentChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Monthly", "Standard Bi-Weekly", "Accelerated"],
        datasets: [
          {
            label: "Payment",
            data: [monthlyPay, biWeeklyPay, accelerated],
            backgroundColor: ["#0F7570", "#014E4E", "#B38D97"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function createTotalCostChart() {
    const financed = lastCalcResults.financed;
    const isIO = loanType.value === "interestOnly";

    function getTotalCostOverTerm(years) {
      const freq = 12; // monthly for cost chart
      let nominal =
        parseFloat(interestRateInput.value) / 100 +
        (variableRateBtn.checked ? 0.01 : 0);
      let cFreq = compoundingFrequency.value || "2";
      let perR = getPeriodicRate(nominal, freq, cFreq);

      let lumpsumAnnual = parseCurrency(annualPrepayment.value);
      let lumpsumOnce = parseCurrency(oneTimePayment.value);
      let extraFrac = parseInt(fasterFrequencyDropdown.value) / 100;

      const partialN = freq * years;
      const res = doPartialAmort(
        financed,
        perR,
        freq,
        lumpsumAnnual,
        lumpsumOnce,
        extraFrac,
        partialN,
        isIO
      );
      // principal + interest for that partial period
      let principalPaid = financed - res.finalBalance;
      return principalPaid + res.totalInterest;
    }

    // We'll show total cost for 5, 10, 20, 30 years
    const terms = [5, 10, 20, 30];
    const totalCosts = terms.map((t) => getTotalCostOverTerm(t));

    const ctx = $("totalCostChart").getContext("2d");
    totalCostChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: terms.map((t) => `${t} yrs`),
        datasets: [
          {
            label: "Total Paid",
            data: totalCosts,
            backgroundColor: "#0F7570"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
});
