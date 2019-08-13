import { createException } from '../../src/utils';

describe('utils.js', () => {
  it('should create properly formatted exceptions', () => {
    const message = 'You did something wrong.';
    const formattedMessage = `[rbactrl]: ${message}`;

    expect(createException(message)).toEqual(Error(formattedMessage));
  });
});
