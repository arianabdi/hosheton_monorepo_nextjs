export function MoneySeparator ( value: any ){
  // Function to format a number as currency with a separator
  const formatCurrency = (number: any) => {
    return number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Format the value with a separator
  return formatCurrency(value)
};
