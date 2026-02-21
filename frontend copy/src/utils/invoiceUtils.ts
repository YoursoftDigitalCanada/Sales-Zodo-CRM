export const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  // Helper to convert numbers 0-999
  const convertGroup = (n: number) => {
    if (n === 0) return '';
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += ' ' + a[n % 10];
        else str += ' ';
      }
    }
    return str;
  };

  if (num === 0) return 'Zero Dollars Only';

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let str = '';
  
  // Billions
  const billions = Math.floor(integerPart / 1000000000);
  if (billions > 0) str += convertGroup(billions) + 'Billion ';
  
  // Millions
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  if (millions > 0) str += convertGroup(millions) + 'Million ';

  // Thousands
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  if (thousands > 0) str += convertGroup(thousands) + 'Thousand ';

  // Hundreds/Tens/Ones
  const remainder = integerPart % 1000;
  if (remainder > 0) str += convertGroup(remainder);

  str += 'Dollars';

  // Cents Logic
  if (decimalPart > 0) {
    str += ' and ' + convertGroup(decimalPart).trim() + ' Cents';
  } else {
    str += ' Only';
  }

  return str;
};

export const calculateLineItem = (qty: number, rate: number, gstRate: number) => {
  const amount = qty * rate;
  
  // NOTE: This splits the tax 50/50. 
  // In Canada (Ontario), 13% HST is usually just one tax.
  // But to keep your table columns working, we will keep the split logic.
  // You can use the 'cgst' column for GST and 'sgst' column for PST if needed.
  
  const cgst = (amount * (gstRate / 2)) / 100;
  const sgst = (amount * (gstRate / 2)) / 100;
  const total = amount + cgst + sgst;
  
  return { amount, cgst, sgst, total };
};