import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface QueueUpdate {
  chamberId: string;
  currentSerial: number;
  estimatedWaitMinutes: number;
  delayMinutes: number;
  doctorMessage?: string;
  totalInQueue: number;
  averageConsultTime: number;
  lastUpdated: Date;
}

interface PatientNotification {
  patientId: string;
  type: 'queue_update' | 'turn_soon' | 'your_turn' | 'delay' | 'doctor_message' | 'cancelled';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/queue',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('QueueGateway');
  
  // Track connected clients: Map<socketId, { patientId, chamberIds, appointmentIds }>
  private connectedClients = new Map<string, { 
    patientId?: string; 
    doctorId?: string;
    chamberIds: string[];
    appointmentIds: string[];
  }>();

  // Track active queues: Map<chamberId, QueueUpdate>
  private activeQueues = new Map<string, QueueUpdate>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { chamberIds: [], appointmentIds: [] });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Leave all rooms
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.chamberIds.forEach(chamberId => {
        client.leave(`chamber:${chamberId}`);
      });
      clientData.appointmentIds.forEach(aptId => {
        client.leave(`appointment:${aptId}`);
      });
    }
    
    this.connectedClients.delete(client.id);
  }

  // ============ PATIENT METHODS ============

  @SubscribeMessage('patient:join')
  handlePatientJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { patientId: string; appointmentIds: string[]; chamberIds: string[] }
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.patientId = data.patientId;
      clientData.appointmentIds = data.appointmentIds;
      clientData.chamberIds = data.chamberIds;

      // Join rooms for real-time updates
      data.appointmentIds.forEach(aptId => client.join(`appointment:${aptId}`));
      data.chamberIds.forEach(chamberId => {
        client.join(`chamber:${chamberId}`);
        
        // Send current queue status immediately
        const queueData = this.activeQueues.get(chamberId);
        if (queueData) {
          client.emit('queue:status', queueData);
        }
      });

      this.logger.log(`Patient ${data.patientId} joined with ${data.appointmentIds.length} appointments`);
    }

    return { success: true, message: 'Connected to queue updates' };
  }

  @SubscribeMessage('patient:leave')
  handlePatientLeave(@ConnectedSocket() client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.chamberIds.forEach(id => client.leave(`chamber:${id}`));
      clientData.appointmentIds.forEach(id => client.leave(`appointment:${id}`));
      clientData.chamberIds = [];
      clientData.appointmentIds = [];
    }
    return { success: true };
  }

  // ============ DOCTOR METHODS ============

  @SubscribeMessage('doctor:join')
  handleDoctorJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { doctorId: string; chamberIds: string[] }
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.doctorId = data.doctorId;
      clientData.chamberIds = data.chamberIds;
      
      data.chamberIds.forEach(chamberId => {
        client.join(`doctor:${chamberId}`);
      });

      this.logger.log(`Doctor ${data.doctorId} joined chambers: ${data.chamberIds.join(', ')}`);
    }
    return { success: true };
  }

  @SubscribeMessage('doctor:update_queue')
  handleDoctorUpdateQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chamberId: string; currentSerial: number; estimatedWaitMinutes?: number }
  ) {
    const existing = this.activeQueues.get(data.chamberId) || {
      chamberId: data.chamberId,
      currentSerial: 0,
      estimatedWaitMinutes: 0,
      delayMinutes: 0,
      totalInQueue: 0,
      averageConsultTime: 10,
      lastUpdated: new Date(),
    };

    const updated: QueueUpdate = {
      ...existing,
      currentSerial: data.currentSerial,
      estimatedWaitMinutes: data.estimatedWaitMinutes || existing.estimatedWaitMinutes,
      lastUpdated: new Date(),
    };

    this.activeQueues.set(data.chamberId, updated);
    
    // Broadcast to all patients watching this chamber
    this.server.to(`chamber:${data.chamberId}`).emit('queue:status', updated);
    
    this.logger.log(`Queue updated for chamber ${data.chamberId}: Serial ${data.currentSerial}`);
    
    return { success: true, data: updated };
  }

  @SubscribeMessage('doctor:announce_delay')
  handleDoctorAnnounceDelay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chamberId: string; delayMinutes: number; message?: string }
  ) {
    const existing = this.activeQueues.get(data.chamberId);
    if (existing) {
      existing.delayMinutes = data.delayMinutes;
      existing.doctorMessage = data.message;
      existing.lastUpdated = new Date();
      this.activeQueues.set(data.chamberId, existing);
    }

    // Broadcast delay announcement to all patients
    this.server.to(`chamber:${data.chamberId}`).emit('queue:delay', {
      chamberId: data.chamberId,
      delayMinutes: data.delayMinutes,
      message: data.message,
      timestamp: new Date(),
    });

    this.logger.log(`Delay announced for chamber ${data.chamberId}: ${data.delayMinutes} minutes`);
    
    return { success: true };
  }

  @SubscribeMessage('doctor:call_patient')
  handleDoctorCallPatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string; patientId: string; serialNumber: number }
  ) {
    // Send notification to specific patient
    this.server.to(`appointment:${data.appointmentId}`).emit('queue:your_turn', {
      appointmentId: data.appointmentId,
      message: 'আপনার পালা এসেছে! দয়া করে ডাক্তারের কক্ষে আসুন।',
      messageEn: "It's your turn! Please proceed to the doctor's room.",
      timestamp: new Date(),
    });

    this.logger.log(`Patient ${data.patientId} called for appointment ${data.appointmentId}`);
    
    return { success: true };
  }

  @SubscribeMessage('doctor:complete_patient')
  handleDoctorCompletePatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string; chamberId: string; nextSerial: number }
  ) {
    // Update queue
    const existing = this.activeQueues.get(data.chamberId);
    if (existing) {
      existing.currentSerial = data.nextSerial - 1;
      existing.lastUpdated = new Date();
      this.activeQueues.set(data.chamberId, existing);
      
      // Broadcast updated queue
      this.server.to(`chamber:${data.chamberId}`).emit('queue:status', existing);
    }

    // Notify patient consultation is complete
    this.server.to(`appointment:${data.appointmentId}`).emit('queue:completed', {
      appointmentId: data.appointmentId,
      message: 'আপনার পরামর্শ সম্পন্ন হয়েছে।',
      messageEn: 'Your consultation is complete.',
      timestamp: new Date(),
    });

    return { success: true };
  }

  @SubscribeMessage('doctor:send_message')
  handleDoctorSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chamberId: string; message: string; messageBn?: string }
  ) {
    this.server.to(`chamber:${data.chamberId}`).emit('queue:message', {
      chamberId: data.chamberId,
      message: data.message,
      messageBn: data.messageBn,
      timestamp: new Date(),
    });

    return { success: true };
  }

  // ============ PUBLIC HELPER METHODS ============

  /**
   * Notify patient when their turn is approaching (e.g., 2 patients ahead)
   */
  async notifyTurnApproaching(appointmentId: string, patientsAhead: number) {
    this.server.to(`appointment:${appointmentId}`).emit('queue:turn_soon', {
      appointmentId,
      patientsAhead,
      message: `আর ${patientsAhead} জন রোগীর পর আপনার পালা।`,
      messageEn: `${patientsAhead} more patient(s) before your turn.`,
      timestamp: new Date(),
    });
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminder(appointmentId: string, minutesBefore: number) {
    this.server.to(`appointment:${appointmentId}`).emit('appointment:reminder', {
      appointmentId,
      minutesBefore,
      message: minutesBefore === 60 
        ? 'আপনার অ্যাপয়েন্টমেন্ট ১ ঘন্টা পরে।'
        : `আপনার অ্যাপয়েন্টমেন্ট ${minutesBefore} মিনিট পরে।`,
      timestamp: new Date(),
    });
  }

  /**
   * Get current queue status for a chamber
   */
  getQueueStatus(chamberId: string): QueueUpdate | undefined {
    return this.activeQueues.get(chamberId);
  }
}

