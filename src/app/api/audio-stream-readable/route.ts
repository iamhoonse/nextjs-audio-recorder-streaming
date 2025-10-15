import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { progressManager } from '@/lib/progressManager';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id') || `session_${Date.now()}`;
    const uploadDir = join(process.cwd(), 'uploads', sessionId);

    // 디렉토리 생성
    await mkdir(uploadDir, { recursive: true });

    console.log(`Starting streaming session: ${sessionId}`);

    // ReadableStream으로부터 데이터 읽기
    const reader = request.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: 'No request body stream' },
        { status: 400 }
      );
    }

    let chunkIndex = 0;
    let totalBytes = 0;
    const chunks: Uint8Array[] = [];

    // 스트림 처리 (SSE로 진행 상황 전송)
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`Stream ended. Total chunks: ${chunkIndex}, Total bytes: ${totalBytes}`);

          // 전체 오디오 파일도 저장
          const fullAudio = Buffer.concat(chunks);
          await writeFile(join(uploadDir, 'full_audio.webm'), fullAudio);

          // SSE로 완료 메시지 전송
          progressManager.sendProgress(sessionId, {
            type: 'complete',
            sessionId,
            totalChunks: chunkIndex,
            totalBytes,
            message: 'Stream processed successfully'
          });

          break;
        }

        if (value) {
          chunks.push(value);
          totalBytes += value.length;

          // 각 청크를 개별 파일로 저장
          const filename = `chunk_${chunkIndex}.webm`;
          await writeFile(join(uploadDir, filename), value);

          console.log(`Received chunk ${chunkIndex}: ${value.length} bytes`);

          // SSE로 chunk 정보 전송
          progressManager.sendProgress(sessionId, {
            type: 'chunk',
            chunkIndex,
            bytes: value.length,
            totalBytes: totalBytes
          });

          chunkIndex++;
        }
      }

      return NextResponse.json({
        success: true,
        sessionId,
        totalChunks: chunkIndex,
        totalBytes,
        message: 'Stream processed successfully'
      });

    } catch (error) {
      console.error('Error reading stream:', error);
      progressManager.sendProgress(sessionId, {
        type: 'error',
        error: 'Failed to read stream'
      });
      return NextResponse.json(
        { error: 'Failed to read stream' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing stream:', error);
    return NextResponse.json(
      { error: 'Failed to process stream' },
      { status: 500 }
    );
  }
}
