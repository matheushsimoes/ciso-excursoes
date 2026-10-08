test('require do Nest dentro do Jest', () => {
  const core = require('@nestjs/core');
  expect(typeof core.NestFactory).toBe('object');
});