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
        // "2" => semi-annually
        return Math.pow(1 + nominal / 2, 2) - 1;
    }
  }

  function getPeriodicRate(nominal, freq, compFreq) {
    const annualEff = getEffectiveRate(nominal, compFreq);
    return Math.pow(1 + annualEff, 1 / freq) - 1;
  }

  function calcPmt(principal, perRate, totalN) {
    if (perRate <= 0) return principal / totalN;
    return (
      principal *
      ((perRate * Math.pow(1 + perRate, totalN)) /
        (Math.pow(1 + perRate, totalN) - 1))
    );
  }

  function getInsuranceRate(ltv) {
    if (ltv <= 0.80) return 0;
    if (ltv <= 0.85) return 0.018;
    if (ltv <= 0.90) return 0.024;
    if (ltv <= 0.95) return 0.031;
    return null; // not insurable above 95%
  }

  // Full amortization
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

    // lumpsum once
    if (lumpsumOnce > 0 && bal > 0) {
      const used = Math.min(bal, lumpsumOnce);
      bal -= used;
      totPrin += used;
      if (bal < 0) bal = 0;
    }

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

  // Partial amortization
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

    // lumpsum once
    if (lumpsumOnce > 0 && bal > 0) {
      let used = Math.min(bal, lumpsumOnce);
      bal -= used;
      if (bal < 0) bal = 0;
    }

    // approximate basePayment for partial calc
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

  // Find payoff # of payments
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

    const basePayment = calcPmt(principal, perRate, freq * 30);

    let yCount = 0;
    while (bal > 0 && count < 100000) {
      const interestPart = bal * perRate;
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

  /************************************************************
   * 4) PROPERTY TAX & RENTAL SYNC
   ************************************************************/
  function handlePropertyTaxSync() {
    let rawAnn = propertyTax.value.replace(/,/g, "");
    let rawMo = propertyTaxMonthly.value.replace(/,/g, "");
    let valAnn = parseFloat(rawAnn) || 0;
    let valMo = parseFloat(rawMo) || 0;

    if (document.activeElement === propertyTax) {
      valMo = valAnn / 12;
      propertyTaxMonthly.value = formatInt(valMo);
    } else if (document.activeElement === propertyTaxMonthly) {
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
   * 5) MAIN CALCULATION
   ************************************************************/
  function calculateMortgage() {
    handlePropertyTaxSync();
    handleRentalIncomeSync();

    uninsurableComparison.classList.add("d-none");

    // The user-chosen extra% from dropdown
    const xPct = parseInt(fasterFrequencyDropdown.value || "0", 10);
    if (xPct > 0) {
      includesExtraLine.style.display = "block";
      extraPaymentPercent.textContent = xPct + "%";
    } else {
      includesExtraLine.style.display = "none";
      extraPaymentPercent.textContent = "0%";
    }

    const purchaseVal = parseCurrency(mortgageSizeInput.value);
    const dpVal = parseCurrency(downPaymentInput.value);

    let nominalRate = parseFloat(interestRateInput.value) / 100 || 0;
    if (variableRateBtn && variableRateBtn.checked) {
      nominalRate += 0.01;
    }

    // Payment frequency
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
      default:
        baseFreq = 12;
    }

    // Accelerated freq if xPct>0
    let freqSliderVal = parseInt(fasterFrequencySlider.value || "0", 10);
    let actualFreq = baseFreq;
    if (xPct > 0 && freqSliderVal > 0) {
      actualFreq = freqSliderVal;
    }
    if (fasterFrequencyValue) {
      fasterFrequencyValue.textContent = freqSliderVal.toString();
    }

    // compounding freq
    let compFreqVal = compoundingFrequency.value || "2"; // semi-ann default
    let perRate = getPeriodicRate(nominalRate, actualFreq, compFreqVal);

    // amortization
    let years = parseInt(amortizationRange.value, 10) || 25;
    years = clamp(years, 5, 30);
    amortizationDisplay.textContent = years.toString();

    // insurance if dp < 20% and purchaseVal <= 1.5m
    let insurance = 0;
    const loan = purchaseVal - dpVal;
    if (dpVal < 0.2 * purchaseVal && purchaseVal <= 1500000 && loan > 0) {
      const ltv = loan / purchaseVal;
      const iRate = getInsuranceRate(ltv);
      if (iRate !== null) insurance = iRate * loan;
    }
    const financed = loan + insurance;

    let oneT = parseCurrency(oneTimePayment.value);
    let annT = parseCurrency(annualPrepayment.value);
    const isIO = loanType.value === "interestOnly";
    const extraFrac = xPct / 100;
    const totalN = actualFreq * years;

    // do full
    const mainRes = doAmort(financed, perRate, actualFreq, annT, oneT, extraFrac, totalN, isIO);
    const finalBal = mainRes.finalBalance;
    const totalInt = mainRes.totalInterest;

    // partial => user-chosen mortgageTerm
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

    // freq label
    let freqLabel = "/monthly";
    switch (paymentFrequencySelect.value) {
      case "weekly-standard":
        freqLabel = "/weekly";
        break;
      case "daily":
        freqLabel = "/daily";
        break;
      case "semiannual":
        freqLabel = "/semi-annually";
        break;
      default:
        freqLabel = "/monthly";
    }

    // approximate mortgage payment
    let basePay = 0;
    if (!isIO) {
      basePay = calcPmt(financed, perRate, totalN);
      basePay += basePay * extraFrac;
    } else {
      let iOnly = financed * perRate;
      basePay = iOnly + iOnly * extraFrac;
    }

    totalMonthlyCost.textContent = formatCurrency(basePay) + freqLabel;
    monthlyMortgageItem.textContent = formatCurrency(basePay);
    mortgagePaymentDetails.textContent = formatCurrency(basePay) + freqLabel;
    netMortgageInsurance.textContent = formatCurrency(financed);

    if (interestOverTerm) {
      interestOverTerm.textContent = formatCurrency(partialRes.totalInterest);
    }
    if (balanceEndOfTerm) {
      balanceEndOfTerm.textContent = formatCurrency(partialRes.finalBalance);
    }

    let baseline = doAmort(financed, perRate, actualFreq, 0, 0, 0, totalN, isIO);
    let saving = baseline.totalInterest - totalInt;
    if (saving > 0) {
      interestSavingLabel.textContent = `INTEREST SAVING ${formatCurrency(saving)}`;
    } else {
      interestSavingLabel.textContent = `INTEREST SAVING $0`;
    }

    // effective amort
    let payoffCount = findPayoffN(financed, perRate, actualFreq, annT, oneT, extraFrac, isIO);
    let effYears = Math.floor(payoffCount / actualFreq);
    let frac = payoffCount / actualFreq - effYears;
    let effMo = Math.round(frac * 12);
    effectiveAmortization.textContent = `${effYears} yr ${effMo} mo`;
    if (effYears < years) {
      let diff = years - effYears;
      fasterAmortLabel.textContent = `${diff} years faster`;
    } else {
      fasterAmortLabel.textContent = `0 years faster`;
    }

    // reformat left side
    mortgageSizeInput.value = formatInt(purchaseVal);
    downPaymentInput.value = formatInt(dpVal);

    // <5% => show comparison
    uninsurableComparison.classList.add("d-none");
    if (dpVal > 0 && dpVal < 0.05 * purchaseVal) {
      uninsurableComparison.classList.remove("d-none");
      uninsurableUserPayment.textContent = formatCurrency(basePay);
      uninsurableMinDownPayment.textContent = formatCurrency(basePay * 0.98);
    }

    // read expenses
    let cFee = parseCurrency(condoFees.value);
    let hFee = parseCurrency(heat.value);
    let oFee = parseCurrency(otherExpenses.value);

    // rental
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
    rentalIncomeItem.textContent = rent > 0 ? `- ${formatCurrency(rent)}` : "$0.00";

    if (moTotal < 0) {
      totalMonthlyCost.textContent = "$0.00";
    } else {
      totalMonthlyCost.textContent = formatCurrency(moTotal) + freqLabel;
    }

    mortgageSizeDisplay.textContent = formatIntCurrency(purchaseVal);
    downPaymentDisplay.textContent = formatIntCurrency(dpVal);
    insuranceCostDisplay2.textContent = formatCurrency(insurance);
  }

  function calculateScenarioB() {
    scenarioBResult.classList.remove("d-none");
    // placeholder
    scenarioBPayment.textContent = "$1,234.56";
    scenarioBInterestPaid.textContent = "$11,000.00";
    scenarioBInsurance.textContent = "$0.00";
  }

  /************************************************************
   * 6) EVENT HANDLERS FOR INPUT & SLIDERS
   ************************************************************/
  // (A) Generic integer input with partial typing
  function handleIntegerInput(e) {
    let raw = e.target.value.replace(/,/g, "");
    if (raw === "") {
      e.target.value = "";
      calculateMortgage();
      return;
    }
    // keep partial numeric
    raw = raw.replace(/[^\d]/g, "");
    e.target.value = raw;
    calculateMortgage();
  }

  // finalize integer => add commas
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
        // slider pinned at 3M, but label shows typed value
        mortgageSizeSlider.value = maxVal;
        mortgageSizeSliderValue.textContent = `$${formatInt(num)}`; 
      } else {
        // within slider range
        mortgageSizeSlider.value = String(num);
        mortgageSizeSliderValue.textContent = `$${formatInt(num)}`;
      }
    }

    // Down payment => sync slider
    if (e.target === downPaymentInput) {
      syncDownPaymentSlider();
    }

    // property tax or rental => keep consistent
    if (e.target === propertyTax || e.target === propertyTaxMonthly) {
      handlePropertyTaxSync();
    }
    if (e.target === rentalIncomeYearly || e.target === rentalIncomeMonthly) {
      handleRentalIncomeSync();
    }

    calculateMortgage();
  }

  // Down-payment slider sync
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

  // (B) Interest rate => partial decimal
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

  // finalize interest => 2 decimals
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

  // (C) Mortgage size slider
  function handleMortgageSizeSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    // keep the input field matching the slider if within range
    // but if user typed beyond 3,000,000, the slider is pinned but
    // the input remains whatever user typed
    mortgageSizeInput.value = String(val);
    mortgageSizeSliderValue.textContent = "$" + formatInt(val);
    calculateMortgage();
  }

  // (D) Down payment slider
  function handleDownPaymentSlider(e) {
    let mortVal = parseInt(mortgageSizeSlider.value, 10) || 0;
    let sVal = parseInt(downPaymentSlider.value, 10) || 0;
    let dp = Math.round((sVal / 100) * mortVal);
    downPaymentInput.value = String(dp);
    downPaymentSliderValue.textContent = "$" + formatInt(dp);
    downPaymentPercentDisplay.textContent = sVal + "%";
    calculateMortgage();
  }

  // (E) Sliders for condoFees, heat, otherExpenses
  function handleCondoFeesSlider(e) {
    let val = parseInt(e.target.value, 10) || 0;
    condoFees.value = String(val); // raw digits
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
   * 7) INIT + FIRST CALC
   ************************************************************/
  function initSync() {
    // Mortgage slider
    mortgageSizeSlider.max = "3000000";
    mortgageSizeSlider.value = "500000";
    mortgageSizeSliderValue.textContent = "$500,000";

    // Down payment slider
    downPaymentSlider.value = "20";
    downPaymentSliderValue.textContent = "$100,000";
    downPaymentPercentDisplay.textContent = "20%";

    // Interest rate
    interestRateSlider.value = "4.24";
    interestRateInput.value = "4.24";
    interestRateSliderValue.textContent = "4.24%";

    // Home expenses
    condoFeesSlider.value = "0";
    heatSlider.value = "0";
    otherExpensesSlider.value = "0";

    // Faster payment
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

    // text fields
    mortgageSizeInput.value = "500,000";
    downPaymentInput.value = "100,000";
    propertyTax.value = "0";
    propertyTaxMonthly.value = "0";
    condoFees.value = "0";
    heat.value = "0";
    otherExpenses.value = "0";
    oneTimePayment.value = "0";
    annualPrepayment.value = "0";
  }

  /************************************************************
   * 8) ADD LISTENERS
   ************************************************************/
  // All integer fields => partial on input, finalize on blur
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

  // Interest rate
  interestRateInput.addEventListener("input", handleInterestRateInput);
  interestRateInput.addEventListener("blur", finalizeInterestRate);
  interestRateSlider.addEventListener("input", () => {
    // user moved the slider => update the input + label
    let val = parseFloat(interestRateSlider.value) || 0;
    let valStr = val.toFixed(2);
    interestRateInput.value = valStr;
    interestRateSliderValue.textContent = valStr + "%";
    calculateMortgage();
  });

  // Mortgage & Down Payment sliders
  mortgageSizeSlider.addEventListener("input", handleMortgageSizeSlider);
  downPaymentSlider.addEventListener("input", handleDownPaymentSlider);

  // Condo Fees, Heat, Other Expenses sliders
  condoFeesSlider.addEventListener("input", handleCondoFeesSlider);
  heatSlider.addEventListener("input", handleHeatSlider);
  otherExpensesSlider.addEventListener("input", handleOtherExpensesSlider);

  // Payment Frequency & Others
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

  // Faster Payment
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

  // Rental Income Toggle
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

  // Scenario B
  calculateScenarioBButton.addEventListener("click", calculateScenarioB);

  // Download CSV
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

  // Apply Now
  applyNowBtn.addEventListener("click", () => {
    window.location.href = "https://thegenesisgroup.ca/apply-now/";
  });

  // Init + First Calc
  initSync();
  calculateMortgage();

  /************************************************************
   * 9) BOOTSTRAP POPOVERS
   ************************************************************/
  const popoverTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="popover"]')
  );
  popoverTriggerList.forEach((el) => {
    const pop = new bootstrap.Popover(el, { trigger: "manual" });
    el.addEventListener("click", () => {
      pop.toggle();
      setTimeout(() => {
        pop.hide();
      }, 3000);
    });
  });
});

// For iFrame usage
window.addEventListener("message", (event) => {
  if (event.data.requestHeight) {
    const height = document.body.scrollHeight;
    window.parent.postMessage({ height }, event.origin);
  }
});
