import assert from 'node:assert/strict';
import test from 'node:test';
import {
    computeVoucherTotals,
    suggestChildCode,
    validateVoucherRows,
} from '../app/(main)/accounting/accounting.utils.ts';
import {
    isoToJalaliParts,
    isoToJalaliString,
    jalaliStringToIso,
    jalaliYearLength,
} from '../app/(main)/accounting/jalali.client.ts';

// ------------------------------------------------------------------ توازن سند

test('computeVoucherTotals detects a balanced voucher', () => {
    const result = computeVoucherTotals([
        { accountId: 'a', debit: 5000000 },
        { accountId: 'b', credit: 5000000 },
    ]);
    assert.equal(result.totalDebit, 5000000);
    assert.equal(result.totalCredit, 5000000);
    assert.equal(result.difference, 0);
    assert.equal(result.isBalanced, true);
});

test('computeVoucherTotals detects an unbalanced voucher', () => {
    const result = computeVoucherTotals([
        { accountId: 'a', debit: 1000 },
        { accountId: 'b', credit: 900 },
    ]);
    assert.equal(result.isBalanced, false);
    assert.equal(result.difference, 100);
});

test('computeVoucherTotals rejects a single-row voucher', () => {
    const result = computeVoucherTotals([{ accountId: 'a', debit: 1000 }]);
    assert.equal(result.isBalanced, false);
});

// ------------------------------------------------------------- اعتبارسنجی ردیف‌ها

test('validateVoucherRows returns null for a valid voucher', () => {
    const error = validateVoucherRows([
        { accountId: 'a', debit: 1500 },
        { accountId: 'b', credit: 1500 },
    ]);
    assert.equal(error, null);
});

test('validateVoucherRows flags both debit and credit on one row', () => {
    const error = validateVoucherRows([
        { accountId: 'a', debit: 1500, credit: 1500 },
        { accountId: 'b', credit: 1500 },
    ]);
    assert.match(error || '', /همزمان بدهکار و بستانکار/);
});

test('validateVoucherRows flags missing account', () => {
    const error = validateVoucherRows([
        { debit: 1500 },
        { accountId: 'b', credit: 1500 },
    ]);
    assert.match(error || '', /حساب انتخاب نشده/);
});

// ------------------------------------------------------------- پیشنهاد کد حساب

test('suggestChildCode suggests the next root code', () => {
    assert.equal(suggestChildCode(null, ['1', '2']), '3');
    assert.equal(suggestChildCode(null, []), '1');
});

test('suggestChildCode suggests the next two-digit child suffix', () => {
    assert.equal(suggestChildCode('1101', ['110101', '110102']), '110103');
    assert.equal(suggestChildCode('1101', []), '110101');
});

// ------------------------------------------------------------- تاریخ شمسی

test('gregorian to jalali conversion matches the known date', () => {
    // ۲۰۲۶-۰۹-۰۸ = ۱۴۰۵/۰۶/۱۷
    assert.equal(isoToJalaliString('2026-09-08T12:00:00.000Z'), '1405/06/17');
    // ۲۰۲۶-۰۳-۲۱ = ۱ فروردین ۱۴۰۵
    assert.equal(isoToJalaliString('2026-03-20T20:30:00.000Z'), '1405/01/01');
});

test('jalali string to iso round-trips', () => {
    const iso = jalaliStringToIso('1405/06/17');
    assert.ok(iso);
    assert.equal(isoToJalaliString(iso!), '1405/06/17');
});

test('jalaliStringToIso rejects invalid dates', () => {
    assert.equal(jalaliStringToIso('1405/12/30'), null); // ۱۴۰۵ کبیسه نیست
    assert.equal(jalaliStringToIso('1405/13/01'), null);
    assert.equal(jalaliStringToIso('1405/04/32'), null); // تیر ۳۱ روزه است
    assert.equal(jalaliStringToIso('abc'), null);
    assert.ok(jalaliStringToIso('1405/04/31')); // روز آخر تیر معتبر است
});

test('leap year length and esfand day 30', () => {
    assert.equal(jalaliYearLength(1403), 366); // ۱۴۰۳ کبیسه است
    assert.equal(jalaliYearLength(1405), 365);
    assert.ok(jalaliStringToIso('1403/12/30'));
});

test('isoToJalaliParts returns numeric parts', () => {
    const parts = isoToJalaliParts(new Date('2026-03-20T20:30:00.000Z'));
    assert.deepEqual([parts.jy, parts.jm, parts.jd], [1405, 1, 1]);
});
