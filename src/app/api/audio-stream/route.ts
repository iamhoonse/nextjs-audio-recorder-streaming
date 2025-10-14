import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioChunk = formData.get('chunk') as Blob;
    const chunkIndex = formData.get('index') as string;
    const sessionId = formData.get('sessionId') as string;

    if (!audioChunk || !chunkIndex || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 오디오 청크를 서버에 저장 (실제로는 원하는 처리를 수행)
    const uploadDir = join(process.cwd(), 'uploads', sessionId);

    // 디렉토리가 없으면 생성
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // 청크를 파일로 저장
    const buffer = Buffer.from(await audioChunk.arrayBuffer());
    const filename = `chunk_${chunkIndex}.webm`;
    await writeFile(join(uploadDir, filename), buffer);

    console.log(`Received audio chunk ${chunkIndex} for session ${sessionId}`);
    console.log(`Chunk size: ${buffer.length} bytes`);

    return NextResponse.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      size: buffer.length,
      message: 'Chunk received successfully'
    });
  } catch (error) {
    console.error('Error processing audio chunk:', error);
    return NextResponse.json(
      { error: 'Failed to process audio chunk' },
      { status: 500 }
    );
  }
}
