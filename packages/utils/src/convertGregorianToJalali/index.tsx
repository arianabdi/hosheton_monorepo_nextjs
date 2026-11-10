import moment from 'moment-timezone'; // Import timezone support
import 'moment/locale/fa'; // Import the Persian locale
import  jMoment from 'jalali-moment';

export function ConvertGregorianToJalali(gregorianDatetime: any, showDateTime?: any) {
  try {
    // Parse the Gregorian datetime in UTC
    const gregorianMoment = moment.utc(gregorianDatetime, 'YYYY-MM-DD HH:mm:ss');

    // Convert to Tehran timezone
    const tehranMoment = gregorianMoment.tz('Asia/Tehran');

    // Convert to Jalali using jMoment
    const jalaliMoment = jMoment(tehranMoment as any);

    // Format Jalali datetime
    const formattedJalaliDatetime = showDateTime
      ? jalaliMoment.format('jYYYY/jMM/jDD - HH:mm:ss')
      : jalaliMoment.format('jYYYY/jMM/jDD');

    return formattedJalaliDatetime;
  } catch (e) {
    console.error('ConvertGregorianToJalali Error:', e);
    return null;
  }
}
