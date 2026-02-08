const { cleanseName } = require('../utils/nameUtils');

describe('cleanseName', () => {
    test('removes suffixes', () => {
        expect(cleanseName('Patrick Mahomes II')).toBe('patrick mahomes');
        expect(cleanseName('Ken Griffey Jr.')).toBe('ken griffey');
        expect(cleanseName('John Smith Sr')).toBe('john smith');
        expect(cleanseName('King Henry III')).toBe('king henry');
    });

    test('removes apostrophes and periods', () => {
        expect(cleanseName("D'Andre Swift")).toBe('dandre swift');
        expect(cleanseName('T.J. Hockenson')).toBe('tj hockenson');
        expect(cleanseName("De'Von Achane")).toBe('devon achane');
    });

    test('normalizes whitespace', () => {
        expect(cleanseName('  Patrick   Mahomes  ')).toBe('patrick mahomes');
        expect(cleanseName('Josh\tAllen')).toBe('josh allen');
    });

    test('handles edge cases', () => {
        expect(cleanseName('')).toBe('');
        expect(cleanseName(null)).toBe('');
        expect(cleanseName(undefined)).toBe('');
        expect(cleanseName(123)).toBe('');
    });

    test('is case insensitive', () => {
        expect(cleanseName('PATRICK MAHOMES')).toBe('patrick mahomes');
        expect(cleanseName('PaTrIcK mAhOmEs')).toBe('patrick mahomes');
    });
});
