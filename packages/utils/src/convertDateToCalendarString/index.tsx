export function ConvertDateToCalendarString(lastMessageDate: any) {
  const now: any = new Date();
  const messageDate: any = new Date(lastMessageDate);
  const timeDifference = now - messageDate;

  const secondsInMs = 1000;
  const minutesInMs = secondsInMs * 60;
  const hoursInMs = minutesInMs * 60;
  const daysInMs = hoursInMs * 24;
  const weeksInMs = daysInMs * 7;
  const monthsInMs = daysInMs * 30; // Approximation for a month
  const yearsInMs = daysInMs * 365; // Approximation for a year

  if (timeDifference < secondsInMs) {
    return 'الان';
  } else if (timeDifference < minutesInMs) {
    const secondsAgo = Math.floor(timeDifference / secondsInMs);
    return `${secondsAgo} ${secondsAgo === 1 ? 'ثانیه' : 'ثانیه'} پیش `;
  } else if (timeDifference < hoursInMs) {
    const minutesAgo = Math.floor(timeDifference / minutesInMs);
    return `${minutesAgo} ${minutesAgo === 1 ? 'دقیقه' : 'دقیقه'} پیش `;
  } else if (timeDifference < daysInMs) {
    const hoursAgo = Math.floor(timeDifference / hoursInMs);
    return `${hoursAgo} ${hoursAgo === 1 ? 'ساعت' : 'ساعت'} پیش `;
  } else if (timeDifference < weeksInMs) {
    const daysAgo = Math.floor(timeDifference / daysInMs);
    return `${daysAgo} ${daysAgo === 1 ? 'روز' : 'روز'} پیش `;
  } else if (timeDifference < monthsInMs) {
    const weeksAgo = Math.floor(timeDifference / weeksInMs);
    return `${weeksAgo} ${weeksAgo === 1 ? 'هفته' : 'هفته'} پیش `;
  } else if (timeDifference < yearsInMs) {
    const monthsAgo = Math.floor(timeDifference / monthsInMs);
    return `${monthsAgo} ${monthsAgo === 1 ? 'ماه' : 'ماه'} پیش `;
  } else {
    const yearsAgo = Math.floor(timeDifference / yearsInMs);
    return `${yearsAgo} ${yearsAgo === 1 ? 'سال' : 'سال'} پیش `;
  }
}
