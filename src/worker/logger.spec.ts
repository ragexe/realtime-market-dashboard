import { createLogger } from './logger';

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes messages with the scope and keeps all details', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    createLogger('market.worker').debug('received', 'start', 2);

    expect(debug).toHaveBeenCalledWith('[market.worker]', 'received', 'start', 2);
  });

  it('writes each level to the matching console method', () => {
    const methods = (['debug', 'info', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const logger = createLogger('scope');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    for (const method of methods) {
      expect(method).toHaveBeenCalledTimes(1);
    }
  });

  it('drops messages below the minimal level', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logger = createLogger('scope', 'warn');

    logger.debug('hidden');
    logger.warn('shown');

    expect(debug).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[scope]', 'shown');
  });
});
