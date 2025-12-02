import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VoiceService, VoiceSessionConfig } from './voice.service';
import WebSocket from 'ws';

interface VoiceStartMessage {
  language: 'bn' | 'en';
  voiceGender: 'male' | 'female';
  sessionType: 'patient' | 'doctor';
  userId?: string;
}

@WebSocketGateway({
  namespace: 'voice',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private clientSessions: Map<string, string> = new Map(); // clientId -> sessionId

  constructor(private voiceService: VoiceService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Voice client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Voice client disconnected: ${client.id}`);
    
    // Clean up session
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      this.voiceService.closeSession(sessionId);
      this.clientSessions.delete(client.id);
    }
  }

  @SubscribeMessage('voice:start')
  async handleVoiceStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: VoiceStartMessage,
  ) {
    this.logger.log(`Starting voice session for client ${client.id}`);

    try {
      // Create a WebSocket wrapper for the Socket.IO client
      const clientWs = this.createClientWebSocket(client);

      const config: VoiceSessionConfig = {
        userId: data.userId,
        language: data.language || 'bn',
        voiceGender: data.voiceGender || 'female',
        sessionType: data.sessionType || 'patient',
      };

      // Create session
      const sessionId = this.voiceService.createSession(clientWs, config);
      this.clientSessions.set(client.id, sessionId);

      // Connect to Gemini
      const connected = await this.voiceService.connectToGemini(sessionId);

      if (connected) {
        client.emit('voice:ready', { sessionId });
      } else {
        client.emit('voice:error', { error: 'Failed to connect to voice service' });
      }
    } catch (error) {
      this.logger.error(`Voice start error:`, error);
      client.emit('voice:error', { error: 'Failed to start voice session' });
    }
  }

  @SubscribeMessage('voice:audio')
  handleVoiceAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string }, // Base64 encoded audio
  ) {
    const sessionId = this.clientSessions.get(client.id);
    if (!sessionId) {
      client.emit('voice:error', { error: 'No active session' });
      return;
    }

    try {
      const audioBuffer = Buffer.from(data.audio, 'base64');
      this.voiceService.sendAudioToGemini(sessionId, audioBuffer);
    } catch (error) {
      this.logger.error(`Audio processing error:`, error);
    }
  }

  @SubscribeMessage('voice:text')
  handleVoiceText(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ) {
    const sessionId = this.clientSessions.get(client.id);
    if (!sessionId) {
      client.emit('voice:error', { error: 'No active session' });
      return;
    }

    this.voiceService.sendTextToGemini(sessionId, data.text);
  }

  @SubscribeMessage('voice:stop')
  handleVoiceStop(@ConnectedSocket() client: Socket) {
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      this.voiceService.closeSession(sessionId);
      this.clientSessions.delete(client.id);
    }
    client.emit('voice:stopped');
  }

  @SubscribeMessage('voice:stats')
  handleVoiceStats(@ConnectedSocket() client: Socket) {
    const stats = this.voiceService.getSessionStats();
    client.emit('voice:stats', stats);
  }

  /**
   * Create a WebSocket-like wrapper for Socket.IO client
   */
  private createClientWebSocket(client: Socket): WebSocket {
    // Create a simple wrapper that forwards messages to Socket.IO
    const ws = {
      readyState: WebSocket.OPEN,
      send: (data: any) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Forward audio responses
          if (parsed.serverContent?.modelTurn?.parts) {
            for (const part of parsed.serverContent.modelTurn.parts) {
              if (part.inlineData?.mimeType?.startsWith('audio/')) {
                client.emit('voice:audio', {
                  audio: part.inlineData.data,
                  mimeType: part.inlineData.mimeType,
                });
              }
              if (part.text) {
                client.emit('voice:text', { text: part.text });
              }
            }
          }

          // Forward turn complete signal
          if (parsed.serverContent?.turnComplete) {
            client.emit('voice:turn_complete');
          }

          // Forward interruption signal
          if (parsed.serverContent?.interrupted) {
            client.emit('voice:interrupted');
          }

          // Forward errors
          if (parsed.error) {
            client.emit('voice:error', { error: parsed.error.message });
          }
        } catch (e) {
          // Forward raw data if not JSON
          client.emit('voice:data', { data });
        }
      },
      close: () => {
        client.emit('voice:closed');
      },
    } as unknown as WebSocket;

    return ws;
  }
}

