import { NextRequest } from 'next/server';
import { progressManager } from '@/lib/progressManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  console.log(`SSE connection established for session: ${sessionId}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인 메시지 전송
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'SSE connected'
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // 진행 상황 리스너 등록
      const listener = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE message:', error);
        }
      };

      progressManager.subscribe(sessionId, listener);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          console.error('Heartbeat error:', error);
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30초마다

      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        console.log(`SSE connection closed for session: ${sessionId}`);
        clearInterval(heartbeatInterval);
        progressManager.unsubscribe(sessionId, listener);
        try {
          controller.close();
        } catch (error) {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
