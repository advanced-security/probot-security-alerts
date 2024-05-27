import { Severity, toSeverity } from "../../src/config/config.js";

describe("The severity configuration", () => {

  test.each`
  threshold     | value           | expected
  ${'low'}      | ${'WARN'}       | ${false}
  ${'High'}     | ${'LOW'}        | ${false}
  ${'warn'}     | ${'MEDIUM'}     | ${true}
  ${'NOTE'}     | ${'ERROR'}      | ${true}
  ${'error'}    | ${'NOTE'}       | ${false}
  ${'none'}     | ${'CRITICAL'}   | ${false}
  ${'lOw'}      | ${'NOTE'}       | ${false}
  ${'MED'}      | ${'CRITICAL'}   | ${true}
  ${'all'}      | ${'HIGH'}       | ${true}
  ${'medium'}   | ${'HIGH'}       | ${true}
  ${'critical'} | ${'ERROR'}      | ${false}
  ${'dog'}      | ${'NOTE'}       | ${true}
  ${null}       | ${'CRITICAL'}   | ${true}
  ${undefined}  | ${'HIGH'}       | ${true}
  `('Setting the threshold to `$threshold` will match the severity `$value`: $expected',
      async ({ threshold, value, expected }) => {
          // Act
          const result = toSeverity(value);
          
          // Assert
          if (expected) {
            expect(result).toBeGreaterThanOrEqual(toSeverity(threshold));
          }
          else {
            expect(result).not.toBeGreaterThanOrEqual(toSeverity(threshold));
          }
  });

  test.each`
  value         | expected
  ${'low'}      | ${'LOW'}
  ${'High'}     | ${'HIGH'}
  ${'warn'}     | ${'ALL'}
  ${'warning'}  | ${'WARNING'}
  ${'NOTE'}     | ${'NOTE'}
  ${'error'}    | ${'ERROR'}
  ${'LOW'}      | ${'LOW'}
  ${'lOw'}      | ${'LOW'}
  ${'MED'}      | ${'ALL'}
  ${'all'}      | ${'ALL'}
  ${'medium'}   | ${'MEDIUM'}
  ${'critical'} | ${'CRITICAL'}
  ${'dog'}      | ${'ALL'}
  ${null}       | ${'ALL'}
  ${undefined}  | ${'ALL'}
  `('should return $expected for the setting `$value`',
      async ({ value, expected }) => {
          // Act
          const result = toSeverity(value);
          
          // Assert
          expect(Severity[result]).toEqual(expected);
          expect(result).toEqual(toSeverity(expected));
  });
});
