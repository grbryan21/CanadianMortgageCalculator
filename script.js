document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------------
  // 1. ELEMENT REFERENCES (With optional checks)
  // ------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }

  const mortgageSizeInput        = $("mortgageSize");
  const mortgageSizeSlider       = $("mortgageSizeSlider");
  const mortgageSizeSliderValue  = $("mortgageSizeSliderValue");

  const downPaymentInput         = $("downPaymentInput");
  const downPaymentSlider        = $("downPaymentSlider");
  const downPaymentPercentDisplay= $("downPaymentPercentDisplay");
  const downPaymentSliderValue   = $("downPaymentSliderValue");

  const propertyType             = $("propertyType");
  const paymentFrequencySelect   = $("paymentFrequency");
  const fixedRateBtn             = $("fixedRateBtn");
  const variableRateBtn          = $("variableRateBtn");
  const interestRateInput        = $("interestRateInput");
  const interestRateSlider       = $("interestRateSlider");
  const interestRateSliderValue  = $("interestRateSliderValue");
  
  const mortgageTermSelect       = $("mortgageTermSelect");
  const amortizationRange        = $("amortization");
  const amortizationDisplay      = $("amortizationDisplay");

  // Home Expenses
  const propertyTax              = $("propertyTax");
  const propertyTaxMonthly       = $("propertyTaxMonthly");
  const condoFeesSlider          = $("condoFeesSlider");
  const condoFees                = $("condoFees");
  const heatSlider               = $("heatSlider");
  const heat                     = $("heat");
  const otherExpensesSlider      = $("otherExpensesSlider");
  const otherExpenses            = $("otherExpenses");

  // Rental
  const rentalIncomeToggle       = $("rentalIncomeToggle");
  const rentalIncomeSection      = $("rentalIncomeSection");
  const rentalIncomeYearly       = $("rentalIncomeYearly");
  const rentalIncomeMonthly      = $("rentalIncomeMonthly");

  // Faster
  const fasterFrequencySlider    = $("fasterFrequencySlider");
  const fasterFrequencyValue     = $("fasterFrequencyValue");
  const fasterFrequencyDropdown  = $("fasterFrequencyDropdown");
  const oneTimePaymentSlider     = $("oneTimePaymentSlider");
  const oneTimePayment           = $("oneTimePayment");
  const annualPrepaymentSlider   = $("annualPrepaymentSlider");
  const annualPrepayment         = $("annualPrepayment");
  const includesExtraLine        = $("includesExtraLine");

  // Advanced
  const loanType                 = $("loanType");
  const compoundingFrequency     = $("compoundingFrequency");

  // Right column
  const totalMonthlyCost         = $("totalMonthlyCost");
  const extraPaymentPercent      = $("extraPaymentPercent");
  const monthlyMortgageItem      = $("monthlyMortgageItem");
  const homeExpensesItem         = $("homeExpensesItem");
  const otherExpensesItem        = $("otherExpensesItem");
  const rentalIncomeItem         = $("rentalIncomeItem");

  const mortgageSizeDisplay      = $("mortgageSizeDisplay");
  const downPaymentDisplay       = $("downPaymentDisplay");
  const insuranceCostDisplay2    = $("insuranceCostDisplay2");
  const mortgagePaymentDetails   = $("mortgagePaymentDetails");
  const netMortgageInsurance     = $("netMortgageInsurance");
  const interestOverTerm         = $("interestOverTerm");
  const interestSavingLabel      = $("interestSavingLabel");
  const balanceEndOfTerm         = $("balanceEndOfTerm");
  const effectiveAmortization    = $("effectiveAmortization");
  const fasterAmortLabel         = $("fasterAmortLabel");

  const uninsurableComparison    = $("uninsurableComparison");
  const uninsurableUserPayment   = $("uninsurableUserPayment");
  const uninsurableMinDownPayment= $("uninsurableMinDownPayment");

  // Scenario B
  const scenarioBMortgageAmount  = $("scenarioBMortgageAmount");
  const scenarioBDownPayment     = $("scenarioBDownPayment");
  const scenarioBInterestRate    = $("scenarioBInterestRate");
  const scenarioBAmortization    = $("scenarioBAmortization");
  const scenarioBPaymentFrequency= $("scenarioBPaymentFrequency");
  const scenarioBResult          = $("scenarioBResult");
  const scenarioBPayment         = $("scenarioBPayment");
  const scenarioBInterestPaid    = $("scenarioBInterestPaid");
  const scenarioBInsurance       = $("scenarioBInsurance");
  const calculateScenarioBButton = $("calculateScenarioB");

  // CTA Buttons
  const downloadReportButton     = $("downloadReport");
  const applyNowBtn              = $("applyNowBtn");

  // ------------------------------------------------------------------
  // 2. UTILITY FUNCTIONS
  // ------------------------------------------------------------------

  function parseCurrency(str) {
    return parseFloat(str.replace(/,/g, "")) || 0;
  }
  function formatInt(num) {
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined);
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

  // Convert nominal rate + compounding freq => annual effective
  function getEffectiveRate(nominal, compFreq) {
    if (!compFreq) compFreq="2"; // default
    switch(compFreq){
      case "12": { // monthly
        return Math.pow(1+ nominal/12, 12)-1;
      }
      case "26": { // bi-weekly
        return Math.pow(1+ nominal/26, 26)-1;
      }
      case "52": { // weekly
        return Math.pow(1+ nominal/52, 52)-1;
      }
      case "365": { // daily
        return Math.pow(1+ nominal/365, 365)-1;
      }
      default: { 
        // 2 => semi-ann
        return Math.pow(1+ nominal/2, 2)-1;
      }
    }
  }
  // From annual effective => periodic => freq times per year
  function getPeriodicRate(nominal, freq, compFreq) {
    let annualEff= getEffectiveRate(nominal, compFreq);
    return Math.pow(1+ annualEff, 1/freq)-1;
  }

  // Standard mortgage pmt formula
  function calcPmt(principal, perRate, totalN) {
    if (perRate<=0) return principal/ totalN;
    return principal* (perRate* Math.pow(1+ perRate, totalN)) / (Math.pow(1+ perRate, totalN)-1);
  }

  function getInsuranceRate(ltv){
    if(ltv<=0.80) return 0;
    if(ltv<=0.85) return 0.018;
    if(ltv<=0.90) return 0.024;
    if(ltv<=0.95) return 0.031;
    return null; // not insurable above 95%
  }

  // "One-time" lumpsum on iteration=0, annual lumpsum each 'year' 
  function doAmort(principal, perRate, freq, lumpsumAnnual, lumpsumOnce, extraFraction, totalN, isIO) {
    let bal= principal;
    let totInt=0, totPrin=0;

    // lumpsum once at iteration=0
    if(lumpsumOnce>0 && bal>0){
      const used= Math.min(bal, lumpsumOnce);
      bal-= used;
      totPrin+= used;
      if(bal<0) bal=0;
    }

    // if not interest-only => basePayment
    let basePayment= calcPmt(principal, perRate, totalN);

    let yearlyCount=0;
    for(let i=0; i< totalN; i++){
      if(bal<=0) break;

      let interestPortion= bal* perRate;
      totInt+= interestPortion;

      let princPortion=0;
      if(!isIO){
        // extraFraction => fraction of basePayment
        // so final payment => basePayment + (basePayment* extraFraction)
        let fullPmt= basePayment+ (basePayment* extraFraction);
        princPortion= fullPmt- interestPortion;
      } else {
        // interestOnly => base= interest portion => plus "extra fraction" of that?
        let iOnly= interestPortion;
        let full= iOnly+ (iOnly* extraFraction); 
        princPortion= full- interestPortion; 
      }
      if(princPortion<0) princPortion=0;

      bal-= princPortion;
      totPrin+= princPortion;
      if(bal<0) bal=0;

      yearlyCount++;
      if(yearlyCount=== freq){
        yearlyCount=0;
        if(lumpsumAnnual>0 && bal>0){
          let lum= Math.min(bal, lumpsumAnnual);
          bal-= lum;
          totPrin+= lum;
          if(bal<0) bal=0;
        }
      }
    }
    return { finalBalance: bal, totalInterest: totInt, totalPrincipal: totPrin };
  }

  // partialTerm => for the user-chosen Term
  function doPartialAmort(principal, perRate, freq, lumpsumAnnual, lumpsumOnce, extraFraction, partialN, isIO){
    let bal= principal;
    let totInt=0;

    // lumpsum once
    if(lumpsumOnce>0 && bal>0){
      let used= Math.min(bal, lumpsumOnce);
      bal-= used;
      if(bal<0) bal=0;
    }

    // base payment for non-IO
    // we approximate with total= freq*(some big #)
    let basePayment= calcPmt(principal, perRate, freq*30);

    let yearlyCount=0;
    for(let i=0; i< partialN; i++){
      if(bal<=0) break;
      let interestPortion= bal* perRate;
      totInt+= interestPortion;
      let princPortion=0;
      if(!isIO){
        let full= basePayment+ (basePayment* extraFraction);
        princPortion= full- interestPortion;
      } else {
        let iOnly= interestPortion;
        let full= iOnly+ (iOnly* extraFraction);
        princPortion= full- interestPortion;
      }
      if(princPortion<0) princPortion=0;

      bal-= princPortion;
      if(bal<0) bal=0;

      yearlyCount++;
      if(yearlyCount=== freq){
        yearlyCount=0;
        if(lumpsumAnnual>0 && bal>0){
          let lum= Math.min(bal, lumpsumAnnual);
          bal-= lum;
          if(bal<0) bal=0;
        }
      }
    }
    return { finalBalance: bal, totalInterest: totInt };
  }

  // find # payments for full payoff
  function findPayoffN(principal, perRate, freq, lumpsumAnnual, lumpsumOnce, extraFraction, isIO){
    let bal= principal;
    let count=0;

    // lumpsum once at iteration=0
    if(lumpsumOnce>0 && bal>0){
      let used= Math.min(bal, lumpsumOnce);
      bal-= used;
      if(bal<0) bal=0;
    }

    let basePayment= calcPmt(principal, perRate, freq*30);

    let yearlyCount=0;
    while(bal>0 && count< 99999){
      let interest= bal* perRate;
      let princ=0;
      if(!isIO){
        let full= basePayment+ (basePayment* extraFraction);
        princ= full- interest;
      } else {
        let iOnly= interest;
        let full= iOnly+ (iOnly* extraFraction);
        princ= full- interest;
      }
      if(princ<0) princ=0;

      bal-= princ;
      if(bal<0) bal=0;

      count++;
      yearlyCount++;
      if(yearlyCount=== freq){
        yearlyCount=0;
        if(lumpsumAnnual>0 && bal>0){
          let lum= Math.min(bal, lumpsumAnnual);
          bal-= lum;
          if(bal<0) bal=0;
        }
      }
    }
    return count;
  }

  function calculateMortgage(){
    if(!mortgageSizeInput || !downPaymentInput) return; // if minimal

    uninsurableComparison?.classList.add("d-none");

    // show/hide "Includes x% of extra"
    let xPct= parseInt(fasterFrequencyDropdown?.value||"0",10);
    if(xPct>0 && includesExtraLine){
      includesExtraLine.style.display= "block";
      extraPaymentPercent.textContent= xPct+"%";
    } else if(includesExtraLine) {
      includesExtraLine.style.display= "none";
      extraPaymentPercent.textContent= "0%";
    }

    // inputs
    const purchaseVal= parseCurrency(mortgageSizeInput.value);
    const dpVal= parseCurrency(downPaymentInput.value);
    let nominalRate= parseFloat(interestRateInput.value)/100 ||0;
    if(variableRateBtn && variableRateBtn.checked){
      nominalRate+= 0.01; // e.g. +1% for variable
    }

    let baseFreq=12;
    if(paymentFrequencySelect){
      switch(paymentFrequencySelect.value){
        case "weekly-standard": baseFreq=52; break;
        case "daily": baseFreq=365; break;
        case "semiannual": baseFreq=2; break;
        default: baseFreq=12; break;
      }
    }

    let freqSliderVal= parseInt(fasterFrequencySlider?.value||"0",10);
    if(freqSliderVal<1) freqSliderVal= baseFreq;
    if(fasterFrequencyValue) {
      fasterFrequencyValue.textContent= freqSliderVal.toString();
    }

    let compFreqVal= compoundingFrequency?.value||"2"; // default semi-ann
    let perRate= getPeriodicRate(nominalRate, freqSliderVal, compFreqVal);

    let years= parseInt(amortizationRange.value,10)||25; 
    years= clamp(years,5,30);
    if(amortizationDisplay) amortizationDisplay.textContent= years.toString();

    // insurance if dp<20%
    let insurance=0;
    const loan= purchaseVal- dpVal;
    if(dpVal< 0.2* purchaseVal && purchaseVal<=1500000 && loan>0){
      let ltv= loan/ purchaseVal;
      let iRate= getInsuranceRate(ltv);
      if(iRate!== null) insurance= iRate* loan;
    }
    const financed= loan+ insurance;

    // lumpsums
    let oneT= parseFloat(oneTimePayment.value)||0;
    let annT= parseFloat(annualPrepayment.value)||0;

    // interest only?
    let isIO= (loanType && loanType.value==="interestOnly");

    // extra fraction => xPct => 0.05 => etc
    let extraFrac= xPct/100;

    // full # of payments
    const totalN= freqSliderVal* years;

    // main result
    let mainRes= doAmort(
      financed,
      perRate,
      freqSliderVal,
      annT,
      oneT,
      extraFrac,
      totalN,
      isIO
    );
    let finalBal= mainRes.finalBalance;
    let totalInt= mainRes.totalInterest;

    // partial => user-chosen term
    let chosenTerm= parseInt(mortgageTermSelect?.value||"5",10)||5;
    let partialN= freqSliderVal* chosenTerm;
    let partialRes= doPartialAmort(
      financed,
      perRate,
      freqSliderVal,
      annT,
      oneT,
      extraFrac,
      partialN,
      isIO
    );

    // display
    if(mortgageSizeDisplay) mortgageSizeDisplay.textContent= formatIntCurrency(purchaseVal);
    if(downPaymentDisplay) downPaymentDisplay.textContent= formatIntCurrency(dpVal);
    if(insuranceCostDisplay2) insuranceCostDisplay2.textContent= formatCurrency(insurance);

    // freq label
    let freqLabel="";
    switch(paymentFrequencySelect?.value){
      case "weekly-standard": freqLabel="/weekly"; break;
      case "daily": freqLabel="/daily"; break;
      case "semiannual": freqLabel="/semi-annually"; break;
      default: freqLabel="/monthly"; break;
    }

    // compute basePayment just for display
    let basePay=0;
    if(!isIO){
      // base + extra => do one period
      basePay= calcPmt(financed, perRate, totalN);
      basePay= basePay+ (basePay* extraFrac);
    } else {
      let iOnly= financed* perRate;
      basePay= iOnly+ (iOnly* extraFrac);
    }
    if(totalMonthlyCost){
      totalMonthlyCost.textContent= formatCurrency(basePay)+ freqLabel;
    }
    if(monthlyMortgageItem){
      monthlyMortgageItem.textContent= formatCurrency(basePay);
    }
    if(mortgagePaymentDetails){
      mortgagePaymentDetails.textContent= formatCurrency(basePay)+ freqLabel;
    }
    if(netMortgageInsurance){
      netMortgageInsurance.textContent= formatCurrency(financed);
    }

    // partial => interestOverTerm + balance
    if(interestOverTerm){
      interestOverTerm.textContent= formatCurrency(partialRes.totalInterest);
    }
    if(balanceEndOfTerm){
      balanceEndOfTerm.textContent= formatCurrency(partialRes.finalBalance);
    }

    // interest saving => do baseline no lumpsum/ no extra
    let baseline= doAmort(financed, perRate, freqSliderVal, 0,0,0, totalN, isIO);
    let saving= baseline.totalInterest- totalInt;
    if(saving>0 && interestSavingLabel){
      interestSavingLabel.textContent= `(INTEREST SAVING ${formatCurrency(saving)})`;
    } else if(interestSavingLabel){
      interestSavingLabel.textContent= `(INTEREST SAVING $0)`;
    }

    // effective amort
    let payoffCount= findPayoffN(financed, perRate, freqSliderVal, annT, oneT, extraFrac, isIO);
    let effYears= Math.floor(payoffCount/ freqSliderVal);
    let effRem= (payoffCount/ freqSliderVal)- effYears;
    let effMo= Math.round(effRem*12);
    if(effectiveAmortization){
      effectiveAmortization.textContent= `${effYears} yr ${effMo} mo`;
    }
    if(effYears< years && fasterAmortLabel){
      let diff= years- effYears;
      fasterAmortLabel.textContent= `(${diff} years faster)`;
    } else if(fasterAmortLabel){
      fasterAmortLabel.textContent= `(0 years faster)`;
    }

    // home expenses
    let annTax= parseFloat(propertyTax?.value||"0");
    let moTax= parseFloat(propertyTaxMonthly?.value||"0");
    if(annTax>0) moTax= annTax/12;
    else if(moTax>0) annTax= moTax*12;
    if(propertyTax) propertyTax.value= annTax.toFixed(2);
    if(propertyTaxMonthly) propertyTaxMonthly.value= moTax.toFixed(2);

    let cFee= parseFloat(condoFees?.value||"0");
    let hFee= parseFloat(heat?.value||"0");
    let oFee= parseFloat(otherExpenses?.value||"0");

    let rent=0;
    if(rentalIncomeToggle && rentalIncomeToggle.checked){
      let yRent= parseFloat(rentalIncomeYearly?.value||"0");
      let mRent= parseFloat(rentalIncomeMonthly?.value||"0");
      rent= (yRent>0)? (yRent/12): mRent;
    }
    let moHome= moTax+ cFee+ hFee;
    let moTotal= basePay+ moHome+ oFee- rent;
    if(homeExpensesItem) homeExpensesItem.textContent= formatCurrency(moHome);
    if(otherExpensesItem) otherExpensesItem.textContent= formatCurrency(oFee);
    if(rentalIncomeItem) rentalIncomeItem.textContent= (rent>0)? `- ${formatCurrency(rent)}`:"$0.00";

    if(moTotal<0 && totalMonthlyCost){
      totalMonthlyCost.textContent= "$0.00";
    } else if(totalMonthlyCost){
      totalMonthlyCost.textContent= formatCurrency(moTotal)+ freqLabel;
    }

    // <5% => show comparison
    if(dpVal>0 && dpVal< 0.05* purchaseVal && uninsurableComparison){
      uninsurableComparison.classList.remove("d-none");
      if(uninsurableUserPayment) uninsurableUserPayment.textContent= formatCurrency(basePay);
      if(uninsurableMinDownPayment) uninsurableMinDownPayment.textContent= formatCurrency(basePay*0.98);
    } else if(uninsurableComparison){
      uninsurableComparison.classList.add("d-none");
    }

    // reformat left side
    if(mortgageSizeInput) mortgageSizeInput.value= formatInt(purchaseVal);
    if(downPaymentInput)  downPaymentInput.value= formatInt(dpVal);
  }

  function calculateScenarioB(){
    if(!scenarioBResult) return;
    scenarioBResult.classList.remove("d-none");
    if(scenarioBPayment) scenarioBPayment.textContent= "$1,234.56";
    if(scenarioBInterestPaid) scenarioBInterestPaid.textContent= "$11,000.00";
    if(scenarioBInsurance) scenarioBInsurance.textContent= "$0.00";
  }

  // ------------------------------------------------------------------
  // 3. EVENT LISTENERS (Check for element existence)
  // ------------------------------------------------------------------

  if(mortgageSizeInput) {
    mortgageSizeInput.addEventListener("input", e=>{
      let raw= e.target.value.replace(/,/g,"");
      let num= parseInt(raw)||0;
      e.target.value= formatInt(num);
      if(mortgageSizeSlider){
        mortgageSizeSlider.value= num;
        if(mortgageSizeSliderValue){
          mortgageSizeSliderValue.textContent= "$"+ formatInt(num);
        }
      }
      calculateMortgage();
    });
  }
  if(mortgageSizeSlider) {
    mortgageSizeSlider.addEventListener("input", e=>{
      let val= parseInt(e.target.value,10);
      if(mortgageSizeInput) mortgageSizeInput.value= formatInt(val);
      if(mortgageSizeSliderValue) mortgageSizeSliderValue.textContent= "$"+ formatInt(val);
      calculateMortgage();
    });
  }

  if(downPaymentInput) {
    downPaymentInput.addEventListener("input", e=>{
      let raw= e.target.value.replace(/,/g,"");
      let num= parseInt(raw)||0;
      e.target.value= formatInt(num);
      let mort= parseInt(mortgageSizeSlider?.value||"0",10);
      let pct= (num/mort)*100; pct= clamp(pct,0,100);
      if(downPaymentSlider){
        downPaymentSlider.value= pct.toFixed(0);
      }
      if(downPaymentSliderValue){
        downPaymentSliderValue.textContent= "$"+ formatInt(num);
      }
      calculateMortgage();
    });
  }
  if(downPaymentSlider) {
    downPaymentSlider.addEventListener("input", e=>{
      let mort= parseInt(mortgageSizeSlider?.value||"0",10)||0;
      let sVal= parseInt(e.target.value,10)||0;
      let dp= Math.round((sVal/100)* mort);
      if(downPaymentInput) downPaymentInput.value= formatInt(dp);
      if(downPaymentSliderValue) downPaymentSliderValue.textContent= "$"+ formatInt(dp);
      if(downPaymentPercentDisplay) downPaymentPercentDisplay.textContent= sVal+"%";
      calculateMortgage();
    });
  }

  if(paymentFrequencySelect){
    paymentFrequencySelect.addEventListener("change", calculateMortgage);
  }
  if(fixedRateBtn) fixedRateBtn.addEventListener("change", calculateMortgage);
  if(variableRateBtn) variableRateBtn.addEventListener("change", calculateMortgage);

  if(interestRateInput){
    interestRateInput.addEventListener("input", e=>{
      let raw= e.target.value.replace(/,/g,"");
      let val= parseFloat(raw)||0;
      if(val<0) val=0; if(val>10) val=10;
      e.target.value= val.toFixed(2);
      if(interestRateSlider){
        interestRateSlider.value= val.toString();
      }
      if(interestRateSliderValue){
        interestRateSliderValue.textContent= val.toFixed(2)+"%";
      }
      calculateMortgage();
    });
  }
  if(interestRateSlider){
    interestRateSlider.addEventListener("input", e=>{
      let v= parseFloat(e.target.value)||0;
      if(v<0) v=0; if(v>10) v=10;
      if(interestRateInput) interestRateInput.value= v.toFixed(2);
      if(interestRateSliderValue) interestRateSliderValue.textContent= v.toFixed(2)+"%";
      calculateMortgage();
    });
  }

  if(mortgageTermSelect){
    mortgageTermSelect.addEventListener("change", calculateMortgage);
  }
  if(amortizationRange){
    amortizationRange.addEventListener("input", e=>{
      if(amortizationDisplay) amortizationDisplay.textContent= e.target.value;
      calculateMortgage();
    });
  }

  if(propertyTax) propertyTax.addEventListener("input", calculateMortgage);
  if(propertyTaxMonthly) propertyTaxMonthly.addEventListener("input", calculateMortgage);

  if(condoFeesSlider){
    condoFeesSlider.addEventListener("input", e=>{
      if(condoFees) condoFees.value= e.target.value;
      calculateMortgage();
    });
  }
  if(condoFees){
    condoFees.addEventListener("input", e=>{
      if(condoFeesSlider) condoFeesSlider.value= e.target.value;
      calculateMortgage();
    });
  }

  if(heatSlider){
    heatSlider.addEventListener("input", e=>{
      if(heat) heat.value= e.target.value;
      calculateMortgage();
    });
  }
  if(heat){
    heat.addEventListener("input", e=>{
      if(heatSlider) heatSlider.value= e.target.value;
      calculateMortgage();
    });
  }

  if(otherExpensesSlider){
    otherExpensesSlider.addEventListener("input", e=>{
      if(otherExpenses) otherExpenses.value= e.target.value;
      calculateMortgage();
    });
  }
  if(otherExpenses){
    otherExpenses.addEventListener("input", e=>{
      if(otherExpensesSlider) otherExpensesSlider.value= e.target.value;
      calculateMortgage();
    });
  }

  if(rentalIncomeToggle){
    rentalIncomeToggle.addEventListener("change", e=>{
      if(e.target.checked){
        rentalIncomeSection?.classList.remove("d-none");
      } else {
        rentalIncomeSection?.classList.add("d-none");
        if(rentalIncomeYearly) rentalIncomeYearly.value="";
        if(rentalIncomeMonthly) rentalIncomeMonthly.value="";
      }
      calculateMortgage();
    });
  }
  if(rentalIncomeYearly) rentalIncomeYearly.addEventListener("input", calculateMortgage);
  if(rentalIncomeMonthly) rentalIncomeMonthly.addEventListener("input", calculateMortgage);

  if(fasterFrequencySlider){
    fasterFrequencySlider.addEventListener("input", e=>{
      if(fasterFrequencyValue) fasterFrequencyValue.textContent= e.target.value;
      calculateMortgage();
    });
  }
  if(fasterFrequencyDropdown){
    fasterFrequencyDropdown.addEventListener("change", calculateMortgage);
  }

  if(oneTimePaymentSlider){
    oneTimePaymentSlider.addEventListener("input", e=>{
      if(oneTimePayment) oneTimePayment.value= e.target.value;
      calculateMortgage();
    });
  }
  if(oneTimePayment){
    oneTimePayment.addEventListener("input", e=>{
      if(oneTimePaymentSlider) oneTimePaymentSlider.value= e.target.value;
      calculateMortgage();
    });
  }
  if(annualPrepaymentSlider){
    annualPrepaymentSlider.addEventListener("input", e=>{
      if(annualPrepayment) annualPrepayment.value= e.target.value;
      calculateMortgage();
    });
  }
  if(annualPrepayment){
    annualPrepayment.addEventListener("input", e=>{
      if(annualPrepaymentSlider) annualPrepaymentSlider.value= e.target.value;
      calculateMortgage();
    });
  }

  if(loanType) loanType.addEventListener("change", calculateMortgage);
  if(compoundingFrequency) compoundingFrequency.addEventListener("change", calculateMortgage);

  if(downloadReportButton){
    downloadReportButton.addEventListener("click", ()=>{
      alert("Download logic here...");
    });
  }
  if(applyNowBtn){
    applyNowBtn.addEventListener("click", ()=>{
      alert("Apply Now logic here...");
    });
  }

  if(calculateScenarioBButton){
    calculateScenarioBButton.addEventListener("click", calculateScenarioB);
  }

  // init
  function initSync(){
    if(mortgageSizeSlider) mortgageSizeSlider.value= "500000";
    if(downPaymentSlider) downPaymentSlider.value= "20";
    if(interestRateSlider) interestRateSlider.value= "4.24";
    if(interestRateInput) interestRateInput.value= "4.24";
    if(fasterFrequencySlider) fasterFrequencySlider.value= "0";
    if(fasterFrequencyValue) fasterFrequencyValue.textContent= "0";
    if(fasterFrequencyDropdown) fasterFrequencyDropdown.value= "0";
    if(oneTimePayment) oneTimePayment.value= "0";
    if(oneTimePaymentSlider) oneTimePaymentSlider.value= "0";
    if(annualPrepayment) annualPrepayment.value= "0";
    if(annualPrepaymentSlider) annualPrepaymentSlider.value= "0";
    if(mortgageTermSelect) mortgageTermSelect.value= "5";
    if(amortizationRange) amortizationRange.value= "25";
    if(amortizationDisplay) amortizationDisplay.textContent= "25";
    if(includesExtraLine) includesExtraLine.style.display= "none";
  }
  initSync();
  calculateMortgage();
});

function sendHeightToParent() {
  const height = document.documentElement.scrollHeight; // Get total height of the child page
  window.parent.postMessage({ height }, "https://thegenesisgroup.ca"); // Only send to the parent domain
}

// Send the height on load and on resize
document.addEventListener("DOMContentLoaded", sendHeightToParent);
window.addEventListener("resize", sendHeightToParent);

// Listen for a specific "requestHeight" message from the parent
window.addEventListener("message", (event) => {
  if (event.data && event.data.requestHeight) {
      sendHeightToParent();
  }
});



