import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Types for queue updates
export interface QueueStatus {
  chamberId: string;
  currentSerial: number;
  estimatedWaitMinutes: number;
  delayMinutes: number;
  doctorMessage?: string;
  totalInQueue: number;
  averageConsultTime: number;
  lastUpdated: Date;
}

export interface QueueNotification {
  type: 'turn_soon' | 'your_turn' | 'delay' | 'message' | 'completed' | 'reminder';
  appointmentId?: string;
  chamberId?: string;
  message: string;
  messageBn?: string;
  patientsAhead?: number;
  delayMinutes?: number;
  timestamp: Date;
}

interface UseQueueSocketOptions {
  patientId?: string;
  doctorId?: string;
  appointmentIds?: string[];
  chamberIds?: string[];
  onQueueUpdate?: (status: QueueStatus) => void;
  onNotification?: (notification: QueueNotification) => void;
}

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useQueueSocket(options: UseQueueSocketOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState<Map<string, QueueStatus>>(new Map());
  const [notifications, setNotifications] = useState<QueueNotification[]>([]);
  const [lastNotification, setLastNotification] = useState<QueueNotification | null>(null);

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/queue`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    newSocket.on('connect', () => {
      console.log('[Queue Socket] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Join appropriate rooms based on role
      if (options.patientId && options.appointmentIds && options.chamberIds) {
        newSocket.emit('patient:join', {
          patientId: options.patientId,
          appointmentIds: options.appointmentIds,
          chamberIds: options.chamberIds,
        });
      } else if (options.doctorId && options.chamberIds) {
        newSocket.emit('doctor:join', {
          doctorId: options.doctorId,
          chamberIds: options.chamberIds,
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[Queue Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Queue Socket] Connection error:', error);
      reconnectAttempts.current++;
    });

    // Queue status updates
    newSocket.on('queue:status', (data: QueueStatus) => {
      console.log('[Queue Socket] Queue status update:', data);
      setQueueStatus(prev => new Map(prev).set(data.chamberId, data));
      options.onQueueUpdate?.(data);
    });

    // Turn is approaching
    newSocket.on('queue:turn_soon', (data: any) => {
      const notification: QueueNotification = {
        type: 'turn_soon',
        appointmentId: data.appointmentId,
        message: data.messageEn || data.message,
        messageBn: data.message,
        patientsAhead: data.patientsAhead,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
    });

    // Your turn!
    newSocket.on('queue:your_turn', (data: any) => {
      const notification: QueueNotification = {
        type: 'your_turn',
        appointmentId: data.appointmentId,
        message: data.messageEn || data.message,
        messageBn: data.message,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
      
      // Trigger browser notification
      if (Notification.permission === 'granted') {
        new Notification('নির্ণয় - আপনার পালা!', {
          body: notification.messageBn || notification.message,
          icon: '/favicon.ico',
          tag: 'queue-turn',
        });
      }
    });

    // Delay announcement
    newSocket.on('queue:delay', (data: any) => {
      const notification: QueueNotification = {
        type: 'delay',
        chamberId: data.chamberId,
        message: data.messageEn || data.message,
        messageBn: data.messageBn || data.message,
        delayMinutes: data.delayMinutes,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
    });

    // Doctor message
    newSocket.on('queue:message', (data: any) => {
      const notification: QueueNotification = {
        type: 'message',
        chamberId: data.chamberId,
        message: data.message,
        messageBn: data.messageBn,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
    });

    // Consultation complete
    newSocket.on('queue:completed', (data: any) => {
      const notification: QueueNotification = {
        type: 'completed',
        appointmentId: data.appointmentId,
        message: data.messageEn || data.message,
        messageBn: data.message,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
    });

    // Appointment reminder
    newSocket.on('appointment:reminder', (data: any) => {
      const notification: QueueNotification = {
        type: 'reminder',
        appointmentId: data.appointmentId,
        message: data.message,
        timestamp: new Date(data.timestamp),
      };
      handleNotification(notification);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [options.patientId, options.doctorId]);

  const handleNotification = (notification: QueueNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    setLastNotification(notification);
    options.onNotification?.(notification);
  };

  // Doctor: Update queue position
  const updateQueue = useCallback((chamberId: string, currentSerial: number, estimatedWaitMinutes?: number) => {
    if (!socket || !isConnected) return;
    
    socket.emit('doctor:update_queue', {
      chamberId,
      currentSerial,
      estimatedWaitMinutes,
    });
  }, [socket, isConnected]);

  // Doctor: Announce delay
  const announceDelay = useCallback((chamberId: string, delayMinutes: number, message?: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('doctor:announce_delay', {
      chamberId,
      delayMinutes,
      message,
    });
  }, [socket, isConnected]);

  // Doctor: Call next patient
  const callPatient = useCallback((appointmentId: string, patientId: string, serialNumber: number) => {
    if (!socket || !isConnected) return;
    
    socket.emit('doctor:call_patient', {
      appointmentId,
      patientId,
      serialNumber,
    });
  }, [socket, isConnected]);

  // Doctor: Complete patient
  const completePatient = useCallback((appointmentId: string, chamberId: string, nextSerial: number) => {
    if (!socket || !isConnected) return;
    
    socket.emit('doctor:complete_patient', {
      appointmentId,
      chamberId,
      nextSerial,
    });
  }, [socket, isConnected]);

  // Doctor: Send message to waiting patients
  const sendMessage = useCallback((chamberId: string, message: string, messageBn?: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('doctor:send_message', {
      chamberId,
      message,
      messageBn,
    });
  }, [socket, isConnected]);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Clear last notification
  const clearLastNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  return {
    isConnected,
    queueStatus,
    notifications,
    lastNotification,
    clearLastNotification,
    requestNotificationPermission,
    // Doctor methods
    updateQueue,
    announceDelay,
    callPatient,
    completePatient,
    sendMessage,
  };
}

export default useQueueSocket;

