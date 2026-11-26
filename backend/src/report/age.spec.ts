import { ageOn } from './age.js';

describe('ageOn', () => {
  it.each([
    ['1990-05-10', '2027-05-09', 36],
    ['1990-05-10', '2027-05-10', 37],
    ['2000-02-29', '2027-02-28', 26],
    ['2000-02-29', '2027-03-01', 27],
  ])('born %s, on %s, is %i years old', (birth, on, expected) => {
    expect(ageOn(birth, on)).toBe(expected);
  });
});
