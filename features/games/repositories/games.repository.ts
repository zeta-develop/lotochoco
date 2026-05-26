import { supabase } from '@/lib/supabase/client';
import { generateId } from '@/lib/utils';
import type { Game, DrawSchedule, GameInput, GameUpdateInput } from '../domain/types';

function mapGame(row: any): Game {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1 || row.is_active === true,
    digitCount: row.digit_count,
    multiplier: row.multiplier,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    schedules: row.draw_schedules ? row.draw_schedules.map(mapSchedule) : undefined
  };
}

function mapSchedule(row: any): DrawSchedule {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    time: row.time,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
  };
}

export const gamesRepository = {
  async getAll(): Promise<Game[]> {
    const { data: games, error } = await supabase
      .from('games')
      .select(`*, draw_schedules (*)`)
      .is('deleted_at', null)
      .order('name', { ascending: true });
      
    if (error) { 
      console.error('Error fetching games:', error); 
      return [];
    }
    return (games || []).map((g: any) => {
      const game = mapGame(g);
      if (game.schedules) {
        game.schedules = game.schedules.filter((s: DrawSchedule) => !s.deletedAt);
        game.schedules.sort((a: DrawSchedule, b: DrawSchedule) => a.time.localeCompare(b.time));
      }
      return game;
    });
  },

  async getActive(): Promise<Game[]> {
    const { data: games, error } = await supabase
      .from('games')
      .select(`*, draw_schedules (*)`)
      .eq('is_active', 1)
      .is('deleted_at', null)
      .order('name', { ascending: true });
      
    if (error) { 
      console.error('Error fetching active games:', error); 
      return [];
    }
    
    return (games || []).map((g: any) => {
      const game = mapGame(g);
      if (game.schedules) {
        game.schedules = game.schedules.filter((s: DrawSchedule) => s.isActive && !s.deletedAt);
        game.schedules.sort((a: DrawSchedule, b: DrawSchedule) => a.time.localeCompare(b.time));
      }
      return game;
    });
  },

  async getById(id: string): Promise<Game | null> {
    const { data: game, error } = await supabase
      .from('games')
      .select(`*, draw_schedules (*)`)
      .eq('id', id)
      .is('deleted_at', null)
      .single();
      
    if (error || !game) return null;
    
    const mappedGame = mapGame(game);
    if (mappedGame.schedules) {
      mappedGame.schedules = mappedGame.schedules.filter((s: DrawSchedule) => !s.deletedAt);
      mappedGame.schedules.sort((a: DrawSchedule, b: DrawSchedule) => a.time.localeCompare(b.time));
    }
    return mappedGame;
  },

  async create(data: GameInput): Promise<Game> {
    const gameId = generateId();
    
    const { error: gameError } = await supabase
      .from('games')
      .insert({ 
        id: gameId, 
        name: data.name, 
        digit_count: data.digitCount, 
        multiplier: data.multiplier, 
        is_active: 1 
      });
      
    if (gameError) throw gameError;

    if (data.schedules && data.schedules.length > 0) {
      const schedulesToInsert = data.schedules.map((s) => ({ 
        id: generateId(), 
        game_id: gameId, 
        name: s.name, 
        time: s.time, 
        is_active: 1 
      }));
      const { error: scheduleError } = await supabase.from('draw_schedules').insert(schedulesToInsert);
      if (scheduleError) throw scheduleError;
    }
    
    const game = await this.getById(gameId);
    if (!game) throw new Error('Error recuperando el juego creado');
    return game;
  },

  async update(id: string, data: GameUpdateInput): Promise<Game> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.digitCount !== undefined) updates.digit_count = data.digitCount;
    if (data.multiplier !== undefined) updates.multiplier = data.multiplier;
    if (data.isActive !== undefined) updates.is_active = data.isActive ? 1 : 0;
    
    if (Object.keys(updates).length > 1) {
      const { error } = await supabase.from('games').update(updates).eq('id', id);
      if (error) throw error;
    }
    
    if (data.schedules !== undefined) {
      const { data: existing } = await supabase
        .from('draw_schedules')
        .select('*')
        .eq('game_id', id)
        .eq('is_active', 1)
        .is('deleted_at', null);
        
      const newIds = data.schedules.map((s) => s.id).filter(Boolean) as string[];
      
      if (existing) {
        for (const ex of existing) {
          if (!newIds.includes(ex.id)) {
            await supabase
              .from('draw_schedules')
              .update({ is_active: 0, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', ex.id);
          }
        }
      }
      
      for (const s of data.schedules) {
        if (s.id) {
          await supabase
            .from('draw_schedules')
            .update({ name: s.name, time: s.time, updated_at: new Date().toISOString() })
            .eq('id', s.id);
        } else {
          await supabase
            .from('draw_schedules')
            .insert({ id: generateId(), game_id: id, name: s.name, time: s.time, is_active: 1 });
        }
      }
    }
    
    const game = await this.getById(id);
    if (!game) throw new Error('Error recuperando el juego actualizado');
    return game;
  },

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    const { error: gameError } = await supabase.from('games').update({ deleted_at: now, updated_at: now }).eq('id', id);
    if (gameError) throw gameError;
    
    const { error: schedulesError } = await supabase.from('draw_schedules').update({ deleted_at: now, updated_at: now }).eq('game_id', id);
    if (schedulesError) throw schedulesError;
  },

  async count(): Promise<number> {
    const { count, error } = await supabase.from('games').select('*', { count: 'exact', head: true }).is('deleted_at', null);
    if (error) throw error;
    return count || 0;
  }
};
