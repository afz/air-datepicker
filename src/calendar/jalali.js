/**
 * Implementation of JavaScript Date class for Jalali calendar
 *
 * @package     JalaliDate
 * @author      Ali Fazelzadeh <afzcode@gmail.com>
 * @copyright   2023 Ali Fazelzadeh
 * @license     http://www.gnu.org/copyleft/lesser.html
 * @see         http://www.fourmilab.ch/documents/calendar/ by John Walker
 * @see         https://github.com/tahajahangir/jdate
 */
export default class JalaliDate extends Date {
    // Proxy get/set time-related methods to internal date object
    #proxyProps = [
        'getHours', 'getMilliseconds', 'getMinutes', 'getSeconds', 'getTime', 'getUTCDay', 'getUTCHours', 'getTimezoneOffset',
        'getUTCMilliseconds', 'getUTCMinutes', 'getUTCSeconds', 'setHours', 'setMilliseconds', 'setMinutes', 'setSeconds',
        'setTime', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCSeconds', 'valueOf', 'getDay'
    ];
    // Proxy to{...} time-related methods
    #proxyToProps = [
        'toLocaleTimeString', 'toLocaleDateString', 'toLocaleString',
        'toJSON', 'toString', 'toUTCString', 'toISOString', 'toTimeString', 'toDateString'
    ];

    #date;

    #cached_date_ts = null;
    #cached_date = {
        'year'  : 0,
        'month' : 0,
        'day'   : 0,
        'wday'  : 0,
        'mday'  : 0,
    };
    #cached_utc_date_ts = null;
    #cached_utc_date = {
        'year'  : 0,
        'month' : 0,
        'day'   : 0,
        'wday'  : 0,
        'mday'  : 0,
    };

    /**
     * Converts a Gregorian date to Julian Day Number.
     *
     * @param   gy Gregorian year
     * @param   gm Gregorian month (1–12)
     * @param   gd Gregorian day (1–31)
     * @return  Julian Day Number
     */
    #gregorian_to_jdn(gy, gm, gd) {
        // Adjust month and year for January and February (they are treated as months 13 and 14 of the previous year)
        if (gm <= 2) {
            gm += 12;
            gy--;
        }

        // Century correction (account for the 100-year rule in Gregorian leap years)
        let A = Math.floor(gy / 100);
        // This corrects the leap year discrepancies in the Gregorian calendar
        let B = 2 - A + Math.floor(A / 4);

        // JDN formula based on Gregorian calendar rules
        return Math.floor(365.25 * (gy + 4716)) + Math.floor(30.6001 * (gm + 1)) + gd + B - 1524.5;
    }

    /**
     * Converts a Julian Day Number (JDN) to Gregorian date.
     *
     * @param   jdn    Julian Day Number
     * @return  Gregorian date (year, month, day)
     */
    #jdn_to_gregorian(jdn) {
        // Step 1: Adjust JDN to account for fractional days
        let N = jdn + 0.5;  // Add 0.5 to account for fractional days in JDN.

        // Step 2: Extract the integer part of the Julian Day Number (Z) and the fractional part (F)
        let Z = Math.floor(N);  // The integer part represents the Julian date number.
        let F = N - Z;  // The fractional part represents the time of day.

        // Step 3: Calculate the number of days since a given reference date
        let A = Math.floor((Z - 1867216.25) / 36524.25);  // Adjust for the leap year cycle difference between Julian and Gregorian calendars
        let B = Z + 1 + A - Math.floor(A / 4);  // Apply further correction for leap years and century adjustments.

        // Step 4: Calculate the Julian year (D) and convert Julian Day to Gregorian date
        let C = B + 1524;  // Get the final value after all corrections
        let D = Math.floor((C - 122.1) / 365.25);  // Calculate the year by considering the leap years and regular years
        let E = Math.floor(365.25 * D);  // Number of days in the year
        let G = Math.floor((C - E) / 30.6001);  // Calculate month and adjust based on the fractional days

        // Step 5: Convert to day, month, and year
        let gd = C - E - Math.floor(30.6001 * G) + F;  // Calculate the day of the month based on the remaining days

        // Step 6: Determine the month
        let gm;
        if (G < 14) {
            gm = G - 1;  // If month is less than 14, it's between March and December
        } else {
            gm = G - 13;  // If month is greater than or equal to 14, it's January or February
        }

        // Step 7: Adjust the year based on the month
        let gy;
        if (gm > 2) {
            gy = D - 4716;  // For months March to December, adjust based on the Julian year calculation
        } else {
            gy = D - 4715;  // For months January and February, adjust the year for leap years and calendar transitions
        }

        // Return the final Gregorian date
        return {
            year: gy,
            month: gm,
            day: Math.floor(gd),
            leap: ((gy % 4) == 0) && (((gy % 100) != 0) || ((gy % 400) == 0)),
        };
    }

    /**
     * Converts a Persian (Jalali) date to Julian Day Number.
     *
     * @param   jy Persian year
     * @param   jm Persian month (1–12)
     * @param   jd Persian day (1–31)
     * @param   leap leap year flag
     * @return  Julian Day Number
     */
    #persian_to_jdn(jy, jm, jd, leap) {
        const breaks = [
            -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
            1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
        ];

        const breaksCount = breaks.length;

        let jump = 0;
        let leapJ = -14;
        let lastBreak = breaks[0];

        if (jy < lastBreak || jy >= breaks[breaksCount - 1]) {
            throw new Error('Invalid Persian/Jalali year : ' + jy);
        }

        // Loop to determine leap years in the Jalali cycle
        for (let i = 1; i < breaksCount; i++) {
            let breakYear = breaks[i];
            jump = breakYear - lastBreak;
            if (jy < breakYear) {
                break;
            }

            leapJ = leapJ + Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4);
            lastBreak = breakYear;
        }

        // Calculate the leap years from the start of Jalali epoch to the current year
        let n = jy - lastBreak;
        leapJ = leapJ + Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);

        // Special adjustment
        if ((jump % 33) === 4 && (jump - n) === 4) {
            leapJ += 1;
        }

        // Initialize Gregorian year and leap year count
        let gy = jy + 621;

        // Calculate the leap years in the Gregorian calendar
        let leapG = Math.floor(gy / 4) - Math.floor((Math.floor(gy / 100) + 1) * 3 / 4) - 150;

        // differ days between year's first day of two calendar
        let day1f = 20 + leapJ - leapG;

        // determine if this Persian/Jalali year is leap
        if (jump - n < 6) {
            n = n - jump + Math.floor((jump + 4) / 33) * 33;
        }
        leap.ok = ((((n + 1) % 33) - 1) % 4) === 0;

        // JDN of day 1 month 1 of Jalali year
        let jy_jdn1f = this.#gregorian_to_jdn(gy, 3, day1f);

        // Standard days in Persian/Jalali calendar
        let j_d_m = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

        let days_in_year = 0;

        // Add the days in the months of the current year
        for (let i = 0; i < jm - 1; i++) {
            days_in_year += j_d_m[i];
        }

        // Add given day
        days_in_year += jd - 1;

        return jy_jdn1f + days_in_year;
    }

    /**
     * Converts Julian Day Number to Persian/Jalali date.
     *
     * @param   jdn    Julian Day Number
     * @return  Persian date (year, month, day)
     */
    #jdn_to_persian(jdn) {
        const gDate = this.#jdn_to_gregorian(jdn);
        let jLeap = {ok: false};
        let jy = gDate.year - 621;

        let jy_jdn1f, remain_days;
        do {
            // JDN of day 1 month 1 of Jalali year
            jy_jdn1f = this.#persian_to_jdn(jy, 1, 1, jLeap);
            remain_days = jdn - jy_jdn1f;
            if (remain_days >= 0) {
                break;
            }

            jy = jy - 1;
        } while (true);

        let jm, jd;
        if (remain_days <= 185) {
            jm = 1 + Math.floor(remain_days / 31);
            jd = (remain_days % 31) + 1;
        } else {
            remain_days = remain_days - 186;
            jm = 7 + Math.floor(remain_days / 30);
            jd = (remain_days % 30) + 1;
        }

        return {
            year: jy,
            month: jm,
            day: jd,
            leap: jLeap.ok,
        };
    }

    /**
     * Converts a Gregorian date to a Jalali (Persian) date.
     *
     * @param   gy Gregorian year
     * @param   gm Gregorian month (1–12)
     * @param   gd Gregorian day (1–31)
     * @return  Jalali date
     */
    gregorian_to_persian(gy, gm, gd) {
        // Adjust year if month greater than 12 or lesser than 1
        gy = gy + ((gm <= 0) ? -1 : (gm > 12 ? 1 : 0));
        // Adjust month
        gm = ((gm + 12) % 12) || 12;

        const jDate = this.#jdn_to_persian(this.#gregorian_to_jdn(gy, gm, gd));

        // start day of week, 0 = Sunday, 6 = Saturday
        const wday = new Date(gy, gm - 1, gd).getDay();

        return {
            year: jDate.year,
            month: jDate.month,
            day: jDate.day,
            wday: wday,
            mday: (jDate.month < 7) ? 31 : (jDate.month < 12) ? 30 : (jDate.leap ? 30 : 29),
        };
    }

    /**
     * Converts a Jalali (Persian) date to a Gregorian date.
     *
     * @param   jy Jalali year
     * @param   jm Jalali month (1–12)
     * @param   jd Jalali day (1–31)
     * @return  Gregorian date
     */
    persian_to_gregorian(jy, jm, jd) {
        // Adjust year if month greater than 12 or lesser than 1
        jy = jy + ((jm <= 0) ? -1 : (jm > 12 ? 1 : 0));
        // Adjust month
        jm = ((jm + 12) % 12) || 12;

        let jLeap = {ok: false};
        const gDate = this.#jdn_to_gregorian(this.#persian_to_jdn(jy, jm, jd, jLeap));

        // Days in Gregorian months
        const g_d_m = [31, gDate.leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // start day of week, 0 = Sunday, 6 = Saturday
        const wday = new Date(gDate.year, gDate.month - 1, gDate.day).getDay();

        return {
            year: gDate.year,
            month: gDate.month,
            day: gDate.day,
            wday: wday,
            mday: g_d_m[gDate.month - 1],
        };
    }

    #parseDate(string, convertToGregorian) {
        /*
         http://en.wikipedia.org/wiki/ISO_8601
         http://dygraphs.com/date-formats.html
         https://github.com/arshaw/xdate/blob/master/src/xdate.js#L414
         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
         tests:
         +parseDate('2014') == +new Date('2014')
         +parseDate('2014-2') == +new Date('2014-02')
         +parseDate('2014-2-3') == +new Date('2014-02-03')
         +parseDate('2014-02-03 12:11') == +new Date('2014/02/03 12:11')
         +parseDate('2014-02-03T12:11') == +new Date('2014/02/03 12:11')
         parseDate('2014/02/03T12:11') == undefined
         +parseDate('2014/02/03 12:11:10.2') == +new Date('2014/02/03 12:11:10') + 200
         +parseDate('2014/02/03 12:11:10.02') == +new Date('2014/02/03 12:11:10') + 20
         parseDate('2014/02/03 12:11:10Z') == undefined
         +parseDate('2014-02-03T12:11:10Z') == +new Date('2014-02-03T12:11:10Z')
         +parseDate('2014-02-03T12:11:10+0000') == +new Date('2014-02-03T12:11:10Z')
         +parseDate('2014-02-03T10:41:10+0130') == +new Date('2014-02-03T12:11:10Z')
         */
        let re = /^(\d|\d\d|\d\d\d\d)(?:([-\/])(\d{1,2})(?:\2(\d|\d\d|\d\d\d\d))?)?(([ T])(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|([+-])(\d{2})(?::?(\d{2}))?)?)?$/,
            match = re.exec(string);
        // re.exec('2012-4-5 01:23:10.1111+0130')
        //  0                              1       2    3    4    5                      6    7     8     9     10      11       12   13    14
        // ["2012-4-5 01:23:10.1111+0330", "2012", "-", "4", "5", " 01:23:10.1111+0130", " ", "01", "23", "10", "1111", "+0330", "+", "03", "30"]
        if (!match) return;

        let separator = match[2],
            timeSeparator = match[6],
            year = +match[1],
            month = +match[3] || 1,
            day = +match[4] || 1,
            isISO = (separator != '/') && (match[6] != ' '),
            hour = +match[7] || 0,
            minute = +match[8] || 0,
            seconds = +match[9] || 0,
            millis = +('0.' + (match[10] || '0')) * 1000,
            tz = match[11],
            isNonLocal = isISO && (tz || !match[5]),
            tzOffset = (match[12] == '-' ? -1 : 1) * ((+match[13] || 0) * 60 + (+match[14] || 0));

        // timezone should be empty if dates are with / (2012/1/10)
        if ((tz || timeSeparator == 'T') && !isISO) return;
        // one and only-one of year/day should be 4-chars (2012/1/10 vs 10/1/2012)
        if ((day >= 1000) == (year >= 1000)) return;

        if (day >= 1000) {
            // year and day only can be swapped if using '/' as separator
            if (separator == '-') return;
            day = +match[1];
            year = day;
        }
        if (convertToGregorian) {
            let gDate = this.persian_to_gregorian(year, month, day);
            year = gDate.year;
            month = gDate.month;
            day = gDate.day;
        }
        let date = new Date(year, month - 1, day, hour, minute, seconds, millis);
        if (isNonLocal) {
            date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset() + tzOffset);
        }

        return date;
    }

    /**
     * returns current Jalali date representation of internal date object, eg. [1394, 12, 5]
     * Caches the converted Jalali date for improving performance
     * @returns {Array}
     */
    #persianDate = function () {
        if (this.#cached_date_ts != +this.#date) {
            this.#cached_date_ts = +this.#date;
            this.#cached_date = this.gregorian_to_persian(
                this.#date.getFullYear(), this.#date.getMonth() + 1, this.#date.getDate()
            );
        }

        return this.#cached_date;
    }

    /**
     * Exactly like `persianDate` but for UTC value of date
     */
    #persianUTCDate() {
        if (this.#cached_utc_date_ts != +this.#date) {
            this.#cached_utc_date_ts = +this.#date;
            this.#cached_utc_date = this.gregorian_to_persian(
                this.#date.getUTCFullYear(), this.#date.getUTCMonth() + 1, this.#date.getUTCDate()
            );
        }

        return this.#cached_utc_date;
    }

    /**
     *
     * @param which , which component of date to change? 0 for year, 1 for month, 2 for day
     * @param value , value of specified component
     * @param {Number=} dayValue , change the day along-side specified component, used for setMonth(month[, dayValue])
     */
    #setPersianDate(which, value, dayValue) {
        let persian = this.#persianDate();
        persian[which] = value;
        if (dayValue !== undefined) {
            persian['day'] = dayValue;
        }
        let new_date = this.persian_to_gregorian(
            persian['year'], persian['month'], persian['day']
        );
        this.#date.setFullYear(new_date.year);
        this.#date.setMonth(new_date.month - 1, new_date.day);
    }

    /**
     * Exactly like `setPersianDate`, but operates UTC value
     */
    #setUTCPersianDate(which, value, dayValue) {
        let persian = this.#persianUTCDate();
        if (dayValue !== undefined) {
            persian['day'] = dayValue;
        }
        persian[which] = value;
        let new_date = this.persian_to_gregorian(
            persian['year'], persian['month'], persian['day']
        );
        this.#date.setUTCFullYear(new_date.year);
        this.#date.setUTCMonth(new_date.month - 1, new_date.day);
    }

    /**
     * All date getter methods
     */
    getDate() {
        return this.#persianDate()['day'];
    }

    getMonth() {
        return this.#persianDate()['month'] - 1;
    }

    getFullYear() {
        return this.#persianDate()['year'];
    }

    getUTCDate() {
        return this.#persianUTCDate()['day'];
    }

    getUTCMonth() {
        return this.#persianUTCDate()['month'] - 1;
    }

    getUTCFullYear() {
        return this.#persianUTCDate()['year'];
    }

    getmday(monthValue) {
        return (monthValue < 6) ? 31 : (monthValue < 11) ? 30 : (this.#persianDate()['leap'] ? 30 : 29);
    }

    /**
     * All date setter methods
     */
    setDate(dayValue) {
        this.#setPersianDate('day', dayValue);
    }

    setFullYear(yearValue) {
        this.#setPersianDate('year', yearValue);
    }

    setMonth(monthValue, dayValue) {
        this.#setPersianDate('month', monthValue + 1, dayValue);
    }

    setUTCDate(dayValue) {
        this.#setUTCPersianDate('day', dayValue);
    }

    setUTCFullYear(yearValue) {
        this.#setUTCPersianDate('year', yearValue);
    }

    setUTCMonth(monthValue, dayValue) {
        this.#setUTCPersianDate('month', monthValue + 1, dayValue);
    }

    /**
     * The Date.now() method returns the number of milliseconds elapsed since 1 January 1970 00:00:00 UTC.
     */
    static now() {
        return Date.now();
    }

    /**
     * The Date.UTC() method accepts the same parameters as the longest form of the constructor, and returns the number of
     * milliseconds in a Date object since January 1, 1970, 00:00:00, universal time.
     */
    static UTC(year, month, date, hours, minutes, seconds, milliseconds) {
        let d = this.persian_to_gregorian(year, month + 1, date || 1);
        return Date.UTC(d.year, d.month - 1, d.day, hours || 0, minutes || 0, seconds || 0, milliseconds || 0);
    }

    /**
     * parses a string representation of a date, and returns the number of milliseconds since January 1, 1970, 00:00:00 UTC.
     */
    static parse(string) {
        return new JalaliDate(string).getTime();
    }

    /**
     * The Date.to{...} methods can return a string with a language sensitive representation of this date,
     * so we change it to return date in Jalali calendar
     */
    #format(method, ...parameters) {
        //FIXME: it's better use Intl.DateTimeFormat to format result
        return this.getFullYear() + '/' + (this.getMonth() + 1).toString().padStart(2, '0') + '/' +
            this.getDate().toString().padStart(2, '0') + ' ' +  this.getHours().toString().padStart(2, '0') + ':' +
            this.getMinutes().toString().padStart(2, '0') + ':' + this.getSeconds().toString().padStart(2, '0');
    }

    /**
     * @param {Object=} a ,may have different types for different semantics: 1) string: parse a date
     *         2) Date object: clone a date object  3) number: value for year
     * @param {Number=} month
     * @param {Number=} day
     * @param {Number=} hour
     * @param {Number=} minute
     * @param {Number=} second
     * @param {Number=} millisecond
     * @constructor
     * @extends {Date}
     */
    constructor(a, month, day, hour, minute, second, millisecond) {
        super();
        if (typeof a == 'string') {
            this.#date = this.#parseDate(a, true);
            if (!this.#date) throw 'Cannot parse date string';
        } else if (arguments.length == 0) {
            this.#date = new Date();
        } else if (arguments.length == 1) {
            this.#date = new Date((a instanceof JalaliDate) ? a._d : a);
        } else {
            let persian = this.persian_to_gregorian(
                a, (month || 0) + 1, day === undefined ? 1 : (day || 0)
            );
            this.#date = new Date(
                persian.year, persian.month - 1, persian.day, hour || 0, minute || 0, second || 0, millisecond || 0
            );
        }

        // proxy to internal Date methods
        this.#proxyProps.forEach((prop) => {
            this[prop] = function () {
                return this.#date[prop].apply(this.#date, arguments);
            };
        });
        // proxy to format method
        this.#proxyToProps.forEach((prop) => {
            this[prop] = function () {
                return this.#format(prop, ...Array.from(arguments));
            };
        });
    }

}
