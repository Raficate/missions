export interface Mission {
  id: string;
  text: string;
}

export interface MissionState {
  lastAssignedDate: string;   // "YYYY-MM-DD" en hora local Europe/Madrid
  lastMissionId: string;
  seenMissionIds: string[];
  completedMissionIds: string[];
  completed: { [missionId: string]: { completedAt: Date } };
}

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface UserDoc {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  missionState: MissionState;
}

export function createEmptyMissionState(): MissionState {
  return {
    lastAssignedDate: '',
    lastMissionId: '',
    seenMissionIds: [],
    completedMissionIds: [],
    completed: {}
  };
}
