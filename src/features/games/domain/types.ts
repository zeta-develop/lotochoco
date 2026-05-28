export interface DrawSchedule {
  id: string;
  gameId: string;
  name: string;
  time: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface Game {
  id: string;
  name: string;
  isActive: boolean;
  digitCount: number;
  multiplier: number;
  schedules?: DrawSchedule[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface GameInput {
  name: string;
  digitCount: number;
  multiplier: number;
  schedules?: { name: string; time: string }[];
}

export interface GameUpdateInput {
  name?: string;
  digitCount?: number;
  multiplier?: number;
  isActive?: boolean;
  schedules?: { id?: string; name: string; time: string }[];
}
