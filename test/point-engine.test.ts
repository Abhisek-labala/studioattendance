import assert from 'assert';
import { calculateWorkPoints } from '../lib/points/engine';
import { calculateAttendanceTiming } from '../lib/attendance/timing';

console.log('Running Studio GFX Automated Test Suite...');

// Test 1: Album Photo Edit: 40 sheets = 40 points
{
  const res = calculateWorkPoints({
    workType: 'Album Photo Edit',
    quantityOrDuration: 40,
    isLateNight: false,
    isOutOfStation: false,
  });
  assert.strictEqual(res.basePoints, 40, '40 album sheets should equal 40 base points');
  assert.strictEqual(res.bonusPoints, 0, 'No bonuses on album photo edit');
  assert.strictEqual(res.totalPoints, 40, 'Total points should be 40');
  console.log('✔ Test 1 Passed: 40 album sheets = 40 points');
}

// Test 2: Video Edit: 3.5 hours = 35 points
{
  const res = calculateWorkPoints({
    workType: 'Video Edit',
    quantityOrDuration: 3.5,
    isLateNight: false,
    isOutOfStation: false,
  });
  assert.strictEqual(res.basePoints, 35, '3.5 hours of video edit should equal 35 base points');
  assert.strictEqual(res.bonusPoints, 0);
  assert.strictEqual(res.totalPoints, 35);
  console.log('✔ Test 2 Passed: 3.5 hours of video edit = 35 points');
}

// Test 3: Standard Wedding Shoot = 20 points
{
  const res = calculateWorkPoints({
    workType: 'Wedding Shoot',
    quantityOrDuration: 1,
    isLateNight: false,
    isOutOfStation: false,
  });
  assert.strictEqual(res.basePoints, 20);
  assert.strictEqual(res.bonusPoints, 0);
  assert.strictEqual(res.totalPoints, 20);
  console.log('✔ Test 3 Passed: Standard Wedding Shoot = 20 points');
}

// Test 4: Late-Night Wedding Shoot = 20 + 10 = 30 points
{
  const res = calculateWorkPoints({
    workType: 'Wedding Shoot',
    quantityOrDuration: 1,
    isLateNight: true,
    isOutOfStation: false,
  });
  assert.strictEqual(res.basePoints, 20);
  assert.strictEqual(res.bonusPoints, 10);
  assert.strictEqual(res.totalPoints, 30);
  assert.strictEqual(res.isLateNightApplied, true);
  console.log('✔ Test 4 Passed: Late-Night Wedding Shoot = 30 points');
}

// Test 5: Out-of-Station Wedding Shoot = 20 + 10 = 30 points
{
  const res = calculateWorkPoints({
    workType: 'Wedding Shoot',
    quantityOrDuration: 1,
    isLateNight: false,
    isOutOfStation: true,
  });
  assert.strictEqual(res.basePoints, 20);
  assert.strictEqual(res.bonusPoints, 10);
  assert.strictEqual(res.totalPoints, 30);
  assert.strictEqual(res.isOutOfStationApplied, true);
  console.log('✔ Test 5 Passed: Out-of-Station Wedding Shoot = 30 points');
}

// Test 6: Out-of-Station Late-Night Wedding Shoot = 20 + 10 + 10 = 40 points
{
  const res = calculateWorkPoints({
    workType: 'Wedding Shoot',
    quantityOrDuration: 1,
    isLateNight: true,
    isOutOfStation: true,
  });
  assert.strictEqual(res.basePoints, 20);
  assert.strictEqual(res.bonusPoints, 20);
  assert.strictEqual(res.totalPoints, 40);
  assert.strictEqual(res.isLateNightApplied, true);
  assert.strictEqual(res.isOutOfStationApplied, true);
  console.log('✔ Test 6 Passed: Out-of-Station Late-Night Wedding Shoot = 40 points');
}

// Test 7: Pre-Wedding Out-of-Station Shoot = 20 + 10 = 30 points
{
  const res = calculateWorkPoints({
    workType: 'Pre-Wedding Shoot',
    quantityOrDuration: 1,
    isLateNight: false,
    isOutOfStation: true,
  });
  assert.strictEqual(res.basePoints, 20);
  assert.strictEqual(res.bonusPoints, 10);
  assert.strictEqual(res.totalPoints, 30);
  console.log('✔ Test 7 Passed: Pre-Wedding Out-of-Station Shoot = 30 points');
}

// Test 8: Late Night bonus must NOT apply to non-wedding shoots (e.g. Engagement)
{
  const res = calculateWorkPoints({
    workType: 'Engagement Shoot',
    quantityOrDuration: 1,
    isLateNight: true, // Should be ignored because engagement shoots are not eligible for late-night bonus
    isOutOfStation: false,
  });
  assert.strictEqual(res.basePoints, 10);
  assert.strictEqual(res.bonusPoints, 0, 'Late night bonus should only apply to wedding shoots');
  assert.strictEqual(res.totalPoints, 10);
  console.log('✔ Test 8 Passed: Late-night bonus strictly restricted to Wedding Shoots');
}

// Test 9: Rework due to editing mistakes earns 0 points
{
  const res = calculateWorkPoints({
    workType: 'Album Photo Edit',
    quantityOrDuration: 50,
    isLateNight: false,
    isOutOfStation: false,
    isRework: true,
  });
  assert.strictEqual(res.totalPoints, 0, 'Rework should earn 0 points');
  console.log('✔ Test 9 Passed: Rework yields 0 points');
}

// Test 10: Attendance timing calculations (Late arrival, Overtime, Total minutes)
{
  // 09:46 check in with 09:30 scheduled + 15 min grace = 15 mins -> 09:45. 09:46 is late!
  const res = calculateAttendanceTiming({
    status: 'Present',
    firstHalfIn: '09:46',
    firstHalfOut: '13:30',
    secondHalfIn: '14:30',
    secondHalfOut: '20:00', // 14:30 to 20:00 = 330 mins. 09:46 to 13:30 = 224 mins. Total = 554 mins.
    scheduledStart: '09:30',
    gracePeriodMinutes: 15,
    fullDayThresholdMinutes: 480,
    overtimeThresholdMinutes: 510,
  });
  assert.strictEqual(res.isLateArrival, true, '09:46 arrival should be marked late');
  assert.strictEqual(res.totalWorkingMinutes, 554, 'Total minutes should be 554');
  assert.strictEqual(res.overtimeMinutes, 74, 'Overtime should be 554 - 480 = 74 minutes');
  console.log('✔ Test 10 Passed: Attendance timing, late arrival & overtime verification');
}

// Test 11: Dynamic Configured Point Rule (e.g. Custom Drone Cinematography)
{
  const customDroneRule = {
    work_type: 'Drone Cinematography',
    rate_unit: 'event',
    base_points_per_unit: 25.0,
    late_night_eligible: true,
    late_night_bonus_points: 15.0,
    out_of_station_eligible: true,
    out_of_station_bonus_points: 10.0,
    rule_version: '1.2',
  };

  const res = calculateWorkPoints(
    {
      workType: 'Drone Cinematography',
      quantityOrDuration: 1,
      isLateNight: true,
      isOutOfStation: true,
    },
    customDroneRule
  );

  assert.strictEqual(res.basePoints, 25);
  assert.strictEqual(res.bonusPoints, 25); // 15 late night + 10 out of station
  assert.strictEqual(res.totalPoints, 50);
  assert.strictEqual(res.ruleVersion, '1.2');
  console.log('✔ Test 11 Passed: Dynamic Configured Point Rule (Drone: 25 + 15 + 10 = 50 pts)');
}

console.log('\n🎉 ALL 11 CORE & DYNAMIC TESTS PASSED SUCCESSFULLY!\n');

