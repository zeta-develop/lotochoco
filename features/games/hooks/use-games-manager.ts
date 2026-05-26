'use client';

import { useCallback, useEffect, useState } from 'react';
import { dbEvents } from '@/lib/events';
import type { Game, GameInput, GameUpdateInput } from '../domain/types';
import { gamesService } from '../services/games.service';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';

export function useGamesManager(activeOnly = true) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = activeOnly 
        ? await gamesService.getActive() 
        : await gamesService.getAll();
      setGames(data);
    } catch (error) {
      console.error('Error en useGamesManager refresh:', error);
      setError(error instanceof Error ? error : new Error('Error al cargar juegos'));
    }
  }, [activeOnly]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setIsLoading(true);
      
      if (cancelled) return;
      
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    return dbEvents.on('games:changed', refresh);
  }, [refresh]);

  useEffect(() => {
    const channelId = Math.random().toString(36).substring(7);
    const gamesChannel = supabase
      .channel(`public:games_sync_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', table: 'games', schema: 'public' },
        () => {
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'draw_schedules', schema: 'public' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [refresh]);

  const createGame = async (gameData: GameInput) => {
    try {
      const game = await gamesService.create(gameData);
      toast({ title: 'Juego creado exitosamente' });
      return game;
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: error instanceof Error ? error.message : 'Error al crear juego' 
      });
      throw error;
    }
  };

  const updateGame = async (id: string, updates: GameUpdateInput) => {
    try {
      const game = await gamesService.update(id, updates);
      toast({ title: 'Juego actualizado exitosamente' });
      return game;
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: error instanceof Error ? error.message : 'Error al actualizar juego' 
      });
      throw error;
    }
  };

  const toggleGameActive = async (game: Game) => {
    try {
      await gamesService.update(game.id, { isActive: !game.isActive });
      toast({ title: `Juego ${game.isActive ? 'desactivado' : 'activado'}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
      throw error;
    }
  };

  const deleteGame = async (game: Game) => {
    try {
      await gamesService.delete(game.id);
      toast({ title: 'Juego eliminado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al eliminar juego' });
      throw error;
    }
  };

  return {
    games,
    isLoading,
    error,
    createGame,
    updateGame,
    toggleGameActive,
    deleteGame,
    refresh,
  };
}
