import { describe, expect, it } from '@rstest/core';
import { axisPlace, dayAxis, shiftSpan } from './day-axis';

describe('Schedule day axis', () => {
  it('runs from the earliest start to the latest end, on whole hours', () => {
    const axis = dayAxis([{ startTime: '07:00', endTime: '15:00' }, { startTime: '09:30', endTime: '17:45' }, { startTime: '11:00', endTime: '18:00' }]);
    expect([axis.start, axis.end]).toEqual([7 * 60, 18 * 60]);
    expect(axis.stepHours).toBe(4);
    expect(axis.ticks.map(tick => tick.label)).toEqual(['7a', '11a', '3p']);
    expect(axisPlace(axis, '07:00', '15:00')).toEqual({ left: 0, width: 72.7273, cut: false });
    expect(axisPlace(axis, '11:00', '18:00')).toEqual({ left: 36.3636, width: 63.6364, cut: false });
  });
  it('matches the board: 6a to 10p puts 9a–1p at 18.75% for 25%', () => {
    const axis = dayAxis([{ startTime: '06:00', endTime: '10:00' }, { startTime: '14:00', endTime: '22:00' }]);
    expect(axis.ticks).toEqual([{ at: 0, label: '6a' }, { at: 25, label: '10a' }, { at: 50, label: '2p' }, { at: 75, label: '6p' }, { at: 100, label: '10p' }]);
    expect(axisPlace(axis, '09:00', '13:00')).toEqual({ left: 18.75, width: 25, cut: false });
  });
  it('widens a day with one short shift to eight hours, evenly', () => {
    const axis = dayAxis([{ startTime: '09:00', endTime: '11:00' }]);
    expect([axis.start, axis.end]).toEqual([6 * 60, 14 * 60]);
    expect(axis.stepHours).toBe(2);
    expect(axisPlace(axis, '09:00', '11:00')).toEqual({ left: 37.5, width: 25, cut: false });
  });
  it('keeps the eight hours inside the day at either end', () => {
    expect(dayAxis([{ startTime: '00:00', endTime: '02:00' }])).toMatchObject({ start: 0, end: 8 * 60 });
    expect(dayAxis([{ startTime: '22:00', endTime: '24:00' }])).toMatchObject({ start: 16 * 60, end: 24 * 60 });
  });
  it('holds a shift past midnight at the axis end and marks it cut', () => {
    expect(shiftSpan('22:00', '06:00')).toEqual({ start: 22 * 60, end: 24 * 60, cut: true });
    const axis = dayAxis([{ startTime: '14:00', endTime: '20:00' }, { startTime: '22:00', endTime: '06:00' }]);
    expect([axis.start, axis.end]).toEqual([14 * 60, 24 * 60]);
    expect(axis.ticks.at(-1)).toEqual({ at: 100, label: '12a' });
    expect(axisPlace(axis, '22:00', '06:00')).toEqual({ left: 80, width: 20, cut: true });
  });
  it('reads a shift that ends at midnight as whole, not cut', () => {
    expect(shiftSpan('20:00', '24:00')).toEqual({ start: 20 * 60, end: 24 * 60, cut: false });
    expect(shiftSpan('20:00', '00:00')).toEqual({ start: 20 * 60, end: 24 * 60, cut: false });
    expect(shiftSpan('00:00', '24:00')).toEqual({ start: 0, end: 24 * 60, cut: false });
    expect(dayAxis([{ startTime: '00:00', endTime: '24:00' }])).toMatchObject({ start: 0, end: 24 * 60, stepHours: 6 });
  });
  it('gives an empty day a plain working day', () => {
    expect(dayAxis([])).toMatchObject({ start: 8 * 60, end: 16 * 60 });
  });
});
