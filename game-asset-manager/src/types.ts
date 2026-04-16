export interface AudioClip {
  id: string;
  label: string;
  prompt: string;
  url: string;
  duration: number;
  tags: string[];
  createdAt: string;
}

export interface VoiceLine {
  id: string;
  text: string;
  label: string;
  url: string;
  tags: string[];
  createdAt: string;
}

export interface Sprite {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  scale: number;
  animFps: number;
  animStartCol: number;
  animEndCol: number;
  previewCol: number;
  previewRow: number;
  audioClips: AudioClip[];
  voiceLines: VoiceLine[];
  music: MapMusic | null;
  tags: string[];
  createdAt: string;
}

export interface MapMusic {
  url: string;
  prompt: string;
  createdAt: string;
}

export interface MapTrack {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  tracks: MapTrack[];
  tags: string[];
  createdAt: string;
}

export type SpriteFormData = {
  name: string;
  description: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  scale: number;
  animFps: number;
  animStartCol?: number;
  animEndCol?: number;
  previewCol?: number;
  previewRow?: number;
  file: File;
};

export type MapFormData = {
  name: string;
  description: string;
  file: File;
};
