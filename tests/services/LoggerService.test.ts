/**
 * Tests pour LoggerService - Système de logging
 */

import { LoggerService } from '../../src/services/LoggerService';
import { LogLevel } from '../../src/types';
import { createMockPlugin, createMockSettings } from '../setup';

describe('LoggerService', () => {
  let logger: LoggerService;
  let mockPlugin: any;
  let mockSettings: any;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    mockSettings = createMockSettings();
    logger = new LoggerService(mockPlugin, mockSettings.debug);
    logger.clearBuffer();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Niveaux de log', () => {
    test('devrait logger les erreurs quand le niveau est ERROR', () => {
      mockSettings.debug.enabled = true;
      mockSettings.debug.logLevel = LogLevel.ERROR;
      logger.updateSettings(mockSettings.debug);

      logger.error('Test error');
      logger.warn('Test warning');
      logger.info('Test info');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
        undefined
      );
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('devrait logger jusqu\'au niveau INFO quand configuré', () => {
      mockSettings.debug.enabled = true;
      mockSettings.debug.logLevel = LogLevel.INFO;
      logger.updateSettings(mockSettings.debug);

      logger.error('Test error');
      logger.warn('Test warning');
      logger.info('Test info');
      logger.debug('Test debug');

      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    test('ne devrait rien logger si désactivé', () => {
      mockSettings.debug.enabled = false;
      logger.updateSettings(mockSettings.debug);

      logger.error('Test error');
      logger.warn('Test warning');
      logger.info('Test info');

      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  describe('Buffer de logs', () => {
    test('devrait ajouter les messages au buffer', async () => {
      mockSettings.debug.enabled = true;
      logger.updateSettings(mockSettings.debug);

      logger.info('Message 1');
      logger.error('Message 2');

      const buffer = logger.getBuffer();
      expect(buffer.length).toBe(2);
      expect(buffer[0]).toContain('Message 1');
      expect(buffer[1]).toContain('Message 2');
    });

    test('devrait vider le buffer', () => {
      mockSettings.debug.enabled = true;
      logger.updateSettings(mockSettings.debug);

      logger.info('Message');
      expect(logger.getBuffer().length).toBe(1);

      logger.clearBuffer();
      expect(logger.getBuffer().length).toBe(0);
    });
  });

  describe('Statistiques', () => {
    test('devrait retourner les statistiques correctes', () => {
      mockSettings.debug.enabled = true;
      logger.updateSettings(mockSettings.debug);
      
      logger.error('Error 1');
      logger.warn('Warning 1');
      logger.info('Info 1');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.isEnabled).toBe(true);
      expect(stats.currentLevel).toBe('INFO');
    });
  });
});