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

  // Displays for slider text
  const interestRateDisplay = document.getElementById("interestRateDisplay");
  const amortizationDisplay = document.getElementById("amortizationDisplay");

  // Config panel
  const configButton = document.getElementById("configButton");
  const configPanel = document.getElementById("configPanel");
  const closeConfig = document.getElementById("closeConfig");

  // Download Report button
  const downloadReportButton = document.getElementById("downloadReport");

  // Format currency
  const formatCurrency = (amount) => {
    if (isNaN(amount)) return "$0.00";
    return `$${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Update progress bar widths using ratio of principal vs. interest
  const updateProgressBar = (principalRatio, interestRatio, principalBar, interestBar) => {
    // Guard to avoid NaN or Infinity if principalRatio + interestRatio is zero
    if (isNaN(principalRatio) || isNaN(interestRatio) || principalRatio < 0 || interestRatio < 0) {
      principalBar.style.width = "50%";
      interestBar.style.width = "50%";
      return;
    }
    principalBar.style.width = (principalRatio * 100).toFixed(2) + "%";
    interestBar.style.width = (interestRatio * 100).toFixed(2) + "%";
  };

  // Main calculation
  const calculateMortgage = () => {
    // 1. Mortgage Amount logic
    let loanAmount = parseFloat(mortgageAmount.value);
    const customAmount = parseFloat(customMortgageAmount.value);
    if (!isNaN(customAmount) && customAmount > parseFloat(mortgageAmount.max)) {
      loanAmount = customAmount;
    } else if (!isNaN(customAmount) && customAmount >= parseFloat(mortgageAmount.min)) {
      // If it's within the slider range, sync the slider
      mortgageAmount.value = customAmount;
      loanAmount = customAmount;
    }
    mortgageAmountDisplay.innerText = formatCurrency(loanAmount);

    // 2. Interest Rate logic
    // If user typed a custom interest rate within 1–10, sync the slider
    const typedRate = parseFloat(customInterestRate.value);
    if (!isNaN(typedRate) && typedRate >= 1 && typedRate <= 10) {
      interestRate.value = typedRate;
    }
    // Also update the interest rate display
    interestRateDisplay.innerText = interestRate.value + "%";

    // 3. Amortization logic
    // Show real-time text for amortization
    amortizationDisplay.innerText = `${amortization.value} years`;

    // 4. Get final input values
    const baseAnnualRate = parseFloat(interestRate.value) / 100;
    const years = parseInt(amortization.value, 10);
    const frequency = paymentFrequency.value;
    const type = loanType.value;
    const isFixedRate = fixedRateButton.classList.contains("active");
    const rateTermYears = parseInt(rateTerm.value, 10);
    const compoundingPerYear = parseInt(compoundingFrequency.value, 10);

    // If variable, add small margin (example: +1%)
    const adjustedRate = isFixedRate ? baseAnnualRate : baseAnnualRate + 0.01;

    // Payment frequency
    let paymentsPerYear;
    let freqString = "";
    switch (frequency) {
      case "monthly":
        paymentsPerYear = 12;
        freqString = "monthly";
        break;
      case "biweekly":
        paymentsPerYear = 26;
        freqString = "biweekly";
        break;
      case "weekly":
        paymentsPerYear = 52;
        freqString = "weekly";
        break;
      case "daily":
        paymentsPerYear = 365;
        freqString = "daily";
        break;
      case "quarterly":
        paymentsPerYear = 4;
        freqString = "quarterly";
        break;
      case "semiannual":
        paymentsPerYear = 2;
        freqString = "semi-annually";
        break;
      default:
        paymentsPerYear = 12;
        freqString = "monthly";
    }

    // Effective annual rate
    const ratePerPeriod = adjustedRate / compoundingPerYear;
    const effectiveAnnualRate = Math.pow(1 + ratePerPeriod, compoundingPerYear) - 1;
    const effectiveRatePerPayment = effectiveAnnualRate / paymentsPerYear;
    const totalPayments = years * paymentsPerYear;

    // Payment calc
    let payment;
    if (type === "interestOnly") {
      payment = loanAmount * effectiveRatePerPayment;
    } else {
      payment =
        (loanAmount * effectiveRatePerPayment) /
        (1 - Math.pow(1 + effectiveRatePerPayment, -totalPayments));
    }

    // Overall totals
    const totalInterest = payment * totalPayments - loanAmount;
    const principalPaid = loanAmount; // entire principal
    const totalPayment = payment * totalPayments;

    // Term calculations
    const termPayments = rateTermYears * paymentsPerYear;
    let balanceAfterTerm;
    if (type === "interestOnly") {
      balanceAfterTerm = loanAmount;
    } else {
      balanceAfterTerm =
        loanAmount * Math.pow(1 + effectiveRatePerPayment, termPayments) -
        payment *
          ((Math.pow(1 + effectiveRatePerPayment, termPayments) - 1) / effectiveRatePerPayment);
    }
    const termPrincipalPaid = loanAmount - balanceAfterTerm;
    const termInterestPaid = payment * termPayments - termPrincipalPaid;

    // PROGRESS BARS:
    // Payment Tab (overall amortization ratio)
    const paymentTabPrincipalRatio = principalPaid / (principalPaid + totalInterest);
    const paymentTabInterestRatio = totalInterest / (principalPaid + totalInterest);
    updateProgressBar(paymentTabPrincipalRatio, paymentTabInterestRatio, principalProgress, interestProgress);

    // Term Tab
    const termSum = termPrincipalPaid + termInterestPaid;
    const termPrincipalRatio = termPrincipalPaid / termSum || 0;
    const termInterestRatio = termInterestPaid / termSum || 0;
    updateProgressBar(termPrincipalRatio, termInterestRatio, termPrincipalProgress, termInterestProgress);

    // Total Tab
    const overallSum = principalPaid + totalInterest;
    const overallPrincipalRatio = principalPaid / overallSum;
    const overallInterestRatio = totalInterest / overallSum;
    updateProgressBar(overallPrincipalRatio, overallInterestRatio, totalPrincipalProgress, totalInterestProgress);

    // PAYMENT TAB updates
    totalPaymentDisplay.innerText = formatCurrency(totalPayment);
    balanceEndOfTermDisplay.innerText = formatCurrency(balanceAfterTerm);
    effectiveAmortizationDisplay.innerText = `${years} years`;

    // Mortgage Payment (with sup frequency)
    monthlyPaymentDisplay.innerHTML = `${formatCurrency(payment)} <sup>${freqString}</sup>`;

    // Update other displays
    principalPaidDisplay.innerText = formatCurrency(principalPaid);
    interestPaidDisplay.innerText = formatCurrency(totalInterest);
    termPrincipalPaidDisplay.innerText = formatCurrency(termPrincipalPaid);
    termInterestPaidDisplay.innerText = formatCurrency(termInterestPaid);
    termTotalPaymentDisplay.innerText = formatCurrency(payment * termPayments);
    termBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    termAmortizationDisplay.innerText = `${years} years`;
    totalPrincipalPaidDisplay.innerText = formatCurrency(principalPaid);
    totalInterestPaidDisplay.innerText = formatCurrency(totalInterest);
    totalPaymentOverallDisplay.innerText = formatCurrency(totalPayment);
    totalBalanceDisplay.innerText = formatCurrency(balanceAfterTerm);
    totalAmortizationDisplay.innerText = `${years} years`;
    termYearsDisplay.innerText = rateTermYears;
  };

  // Generate CSV content and trigger download
  const downloadReport = () => {
    const data = [
      ["Mortgage Payment", monthlyPaymentDisplay.innerText],
      ["Mortgage Amount", mortgageAmountDisplay.innerText],
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

  // EVENT LISTENERS
  mortgageAmount.addEventListener("input", calculateMortgage);
  customMortgageAmount.addEventListener("input", calculateMortgage);
  interestRate.addEventListener("input", calculateMortgage);
  customInterestRate.addEventListener("input", calculateMortgage);
  amortization.addEventListener("input", calculateMortgage);
  paymentFrequency.addEventListener("change", calculateMortgage);
  loanType.addEventListener("change", calculateMortgage);
  compoundingFrequency.addEventListener("change", calculateMortgage);
  rateTerm.addEventListener("change", calculateMortgage);

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

  // "Download Report"
  downloadReportButton.addEventListener("click", downloadReport);

  // Initial calc
  calculateMortgage();
});
