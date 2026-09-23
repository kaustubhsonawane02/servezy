export interface SocketEmitter {
  to: (room: string) => {
    emit: (event: string, ...args: unknown[]) => boolean;
  };
  emit: (event: string, ...args: unknown[]) => boolean;
}

let ioInstance: SocketEmitter | null = null;

export function setIO(io: SocketEmitter): void {
  ioInstance = io;
}

export function getIO(): SocketEmitter {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
}
