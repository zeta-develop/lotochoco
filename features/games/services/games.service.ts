import { dbEvents } from '@/lib/events';
import { gamesRepository } from '../repositories/games.repository';
import type { Game, GameInput, GameUpdateInput } from '../domain/types';

export const gamesService = {
  async getAll(): Promise<Game[]> {
    return gamesRepository.getAll();
  },

  async getActive(): Promise<Game[]> {
    return gamesRepository.getActive();
  },

  async getById(id: string): Promise<Game | null> {
    return gamesRepository.getById(id);
  },

  async create(data: GameInput): Promise<Game> {
    const game = await gamesRepository.create(data);
    dbEvents.emit('games:changed');
    return game;
  },

  async update(id: string, data: GameUpdateInput): Promise<Game> {
    const game = await gamesRepository.update(id, data);
    dbEvents.emit('games:changed');
    return game;
  },

  async delete(id: string): Promise<void> {
    await gamesRepository.delete(id);
    dbEvents.emit('games:changed');
  },

  async seedDefaultGames(): Promise<void> {
    try {
      const count = await gamesRepository.count();
      if (count === 0) {
        const defaultGames: GameInput[] = [
          { name: 'Tica', digitCount: 2, multiplier: 70, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Tarde', time: '15:00' }, { name: 'Noche', time: '21:00' }] },
          { name: 'Nica', digitCount: 2, multiplier: 70, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Tarde', time: '15:00' }, { name: 'Noche', time: '21:00' }] },
          { name: 'Fechas', digitCount: 2, multiplier: 60, schedules: [{ name: 'Única', time: '20:00' }] },
          { name: 'Tres Monazos', digitCount: 3, multiplier: 500, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Noche', time: '21:00' }] }
        ];
        
        for (const gameData of defaultGames) {
          await this.create(gameData);
        }
      }
    } catch (e) {
      console.warn('Error sembrando juegos por defecto:', e);
    }
  }
};
