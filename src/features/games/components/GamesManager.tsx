'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Clock, Gamepad2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useGamesManager } from '../hooks/use-games-manager';
import { formatTime12h } from '@/lib/utils';
import type { Game } from '../domain/types';

export function GamesManager() {
  const { games, isLoading, createGame, updateGame, toggleGameActive, deleteGame } = useGamesManager(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    digitCount: '2',
    multiplier: '70',
    schedules: [{ id: '', name: 'Mañana', time: '11:00' }]
  });

  const resetForm = () => {
    setFormData({
      name: '',
      digitCount: '2',
      multiplier: '70',
      schedules: [{ id: '', name: 'Mañana', time: '11:00' }]
    });
  };

  const handleSaveGame = async () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'El nombre es requerido' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        digitCount: parseInt(formData.digitCount),
        multiplier: parseFloat(formData.multiplier),
        schedules: formData.schedules.filter(s => s.name && s.time).map(s => ({ id: s.id, name: s.name, time: s.time }))
      };

      if (editingGame) {
        await updateGame(editingGame.id, payload);
      } else {
        await createGame(payload);
      }
      
      setShowCreateDialog(false);
      setEditingGame(null);
      resetForm();
    } catch (error) {
      // Los errores ya son mostrados vía toast en el hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGame = async (game: Game) => {
    if (!confirm(`¿Eliminar el juego "${game.name}"?`)) return;
    await deleteGame(game);
  };

  const openEditDialog = (game: Game) => {
    setFormData({
      name: game.name,
      digitCount: game.digitCount.toString(),
      multiplier: game.multiplier.toString(),
      schedules: game.schedules?.map(s => ({ id: s.id, name: s.name, time: s.time })) || []
    });
    setEditingGame(game);
  };

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { id: '', name: '', time: '' }]
    });
  };

  const removeSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.filter((_, i) => i !== index)
    });
  };

  const updateSchedule = (index: number, field: 'name' | 'time', value: string) => {
    const newSchedules = [...formData.schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setFormData({ ...formData, schedules: newSchedules });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestión de Juegos</h2>
        <Button onClick={() => {
          resetForm();
          setShowCreateDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Juego
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.id} className={!game.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  {game.name}
                </div>
                <Switch
                  checked={game.isActive}
                  onCheckedChange={() => toggleGameActive(game)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Dígitos</div>
                  <div className="text-lg font-semibold">{game.digitCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Multiplicador</div>
                  <div className="text-lg font-semibold">x{game.multiplier}</div>
                </div>
              </div>

              {game.schedules && game.schedules.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Horarios
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {game.schedules.map((schedule) => (
                      <Badge key={schedule.id} variant="secondary" className="text-xs">
                        {schedule.name} - {formatTime12h(schedule.time)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditDialog(game)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteGame(game)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog 
        open={showCreateDialog || !!editingGame} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingGame(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGame ? 'Editar Juego' : 'Nuevo Juego'}
            </DialogTitle>
            <DialogDescription>
              {editingGame 
                ? 'Modifica los datos del juego' 
                : 'Crea un nuevo juego de lotería'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Juego</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Tica"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad de Dígitos</Label>
                <Select
                  value={formData.digitCount}
                  onValueChange={(value) => setFormData({ ...formData, digitCount: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dígito</SelectItem>
                    <SelectItem value="2">2 dígitos</SelectItem>
                    <SelectItem value="3">3 dígitos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Multiplicador</Label>
                <Input
                  type="number"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                  placeholder="70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Horarios</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSchedule}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.schedules.map((schedule, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Nombre (Mañana)"
                      value={schedule.name}
                      onChange={(e) => updateSchedule(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                      className="w-32"
                    />
                    {formData.schedules.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(index)}
                        aria-label="Eliminar horario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingGame(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGame}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
